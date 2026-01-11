import express from "express";
import cors from "cors";
import { initShopify, requireShopifyAuth, getShopFromRequest } from "./shopify.js";
import { isValidPhoneNumber } from "libphonenumber-js";

const app = express();

// --- Basic middleware ---
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// --- Shopify init (loads API config, session storage, etc.) ---
const shopify = initShopify();

// --- Health check (what you tested) ---
app.get("/", (req, res) => {
res.json({
status: "ok",
app: "EAS COD App",
scopes: (process.env.SCOPES || "").split(",").filter(Boolean),
});
});

/**
* COD: Create Draft Order -> Complete -> Return order + redirect URL
*
* This endpoint is what your storefront form will POST to.
* It MUST run under an installed shop session (we use Shopify auth session storage).
*/
app.post("/api/cod/create-order", requireShopifyAuth(shopify), async (req, res) => {
try {
const shop = getShopFromRequest(req);
const session = res.locals.shopify?.session;

if (!shop || !session?.accessToken) {
return res.status(401).json({ ok: false, error: "Missing Shopify session/access token" });
}

const {
variantGid, // e.g. "gid://shopify/ProductVariant/123456789"
quantity = 1,
firstName,
phone,
email = "",
address1,
city = "",
province = "",
countryCode, // "KE","TZ","UG","ZM","ZW"
note = "",
thankYouUrl, // e.g. "https://eastafrica.shop/pages/thank-you"
} = req.body || {};

// --- Validation ---
if (!variantGid || typeof variantGid !== "string") {
return res.status(400).json({ ok: false, error: "variantGid is required" });
}
if (!firstName || !phone || !address1 || !countryCode) {
return res.status(400).json({ ok: false, error: "Missing required fields" });
}
const qty = Number(quantity);
if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
return res.status(400).json({ ok: false, error: "Invalid quantity" });
}

// Phone validation per country
// If you want stricter rules per country later, we can enforce exact prefixes/lengths.
if (!isValidPhoneNumber(phone, countryCode)) {
return res.status(400).json({ ok: false, error: `Invalid phone number for ${countryCode}` });
}

// --- Shopify Admin GraphQL client ---
const client = new shopify.clients.Graphql({
session: {
shop,
accessToken: session.accessToken,
},
});

// 1) Create draft order (COD)
const draftCreate = await client.query({
data: {
query: `
mutation DraftOrderCreate($input: DraftOrderInput!) {
draftOrderCreate(input: $input) {
draftOrder {
id
invoiceUrl
}
userErrors { field message }
}
}
`,
variables: {
input: {
email: email || null,
note: note || "COD order",
shippingAddress: {
firstName,
address1,
city,
province,
countryCode,
phone,
},
lineItems: [
{
variantId: variantGid,
quantity: qty,
}
],
},
},
},
});

const createErrors = draftCreate?.body?.data?.draftOrderCreate?.userErrors || [];
if (createErrors.length) {
return res.status(400).json({ ok: false, error: "draftOrderCreate failed", details: createErrors });
}

const draftId = draftCreate.body.data.draftOrderCreate.draftOrder.id;

// 2) Complete draft order -> creates a real Order in Shopify
const draftComplete = await client.query({
data: {
query: `
mutation DraftOrderComplete($id: ID!, $paymentPending: Boolean!) {
draftOrderComplete(id: $id, paymentPending: $paymentPending) {
draftOrder {
id
order {
id
name
}
}
userErrors { field message }
}
}
`,
variables: {
id: draftId,
paymentPending: true
},
},
});

const completeErrors = draftComplete?.body?.data?.draftOrderComplete?.userErrors || [];
if (completeErrors.length) {
return res.status(400).json({ ok: false, error: "draftOrderComplete failed", details: completeErrors });
}

const order = draftComplete.body.data.draftOrderComplete.draftOrder.order;

// Redirect URL to your custom thank-you page
const redirect = (thankYouUrl || "https://eastafrica.shop/pages/thank-you")
+ `?order=${encodeURIComponent(order?.name || "")}&country=${encodeURIComponent(countryCode)}`;

return res.json({
ok: true,
orderId: order?.id || null,
orderName: order?.name || null,
redirect,
});

} catch (err) {
console.error("create-order error:", err);
return res.status(500).json({ ok: false, error: "Server error" });
}
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
