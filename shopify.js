import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { MemorySessionStorage } from "@shopify/shopify-api/dist/auth/session/storage/memory.js";

/**
* IMPORTANT:
* Memory storage resets on Render redeploy.
* It's OK for now to get you working.
* Later we will switch to Redis / DB session storage (production safe).
*/

export function initShopify() {
const {
SHOPIFY_API_KEY,
SHOPIFY_API_SECRET,
SHOPIFY_APP_URL,
SCOPES,
} = process.env;

if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOPIFY_APP_URL) {
throw new Error("Missing required env vars: SHOPIFY_API_KEY / SHOPIFY_API_SECRET / SHOPIFY_APP_URL");
}

const scopes = (SCOPES || "")
.split(",")
.map(s => s.trim())
.filter(Boolean);

if (!scopes.length) {
throw new Error("SCOPES env var is missing/empty. Example: read_products,write_orders,write_draft_orders");
}

return shopifyApi({
apiKey: SHOPIFY_API_KEY,
apiSecretKey: SHOPIFY_API_SECRET,
scopes,
hostName: SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
apiVersion: LATEST_API_VERSION,
isEmbeddedApp: true,
sessionStorage: new MemorySessionStorage(),
});
}

/**
* Minimal auth guard for API routes:
* - expects ?shop=xxxxx.myshopify.com or Shopify signed request context
* - expects we already stored a session for that shop (app installed)
*/
export function requireShopifyAuth(shopify) {
return async (req, res, next) => {
try {
const shop = getShopFromRequest(req);
if (!shop) return res.status(400).json({ ok: false, error: "Missing shop parameter" });

// Load offline session for shop (app install created it)
const offlineId = shopify.session.getOfflineId(shop);
const session = await shopify.sessionStorage.loadSession(offlineId);

if (!session?.accessToken) {
return res.status(401).json({
ok: false,
error: "No offline session found. Install the app on the store again (or complete OAuth).",
});
}

res.locals.shopify = { session };
next();
} catch (e) {
console.error("Auth error:", e);
return res.status(500).json({ ok: false, error: "Auth middleware error" });
}
};
}

export function getShopFromRequest(req) {
// Accept from query or headers. Query is easiest.
const shop = req.query?.shop || req.headers["x-shopify-shop-domain"];
return typeof shop === "string" ? shop : null;
}
