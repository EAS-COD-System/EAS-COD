import express from "express";
import dotenv from "dotenv";
import { initShopify } from "./shopify.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Shopify API
const shopify = initShopify();

/**
* Health check
* Render + browser test
*/
app.get("/", (req, res) => {
res.status(200).send("EAS COD app is running ✅");
});

/**
* ============================
* SHOPIFY OAUTH
* ============================
*/

/**
* Start OAuth
* Example:
* /auth?shop=east-africa-shop-2.myshopify.com
*/
app.get("/auth", async (req, res) => {
const { shop } = req.query;

if (!shop) {
return res.status(400).send("Missing ?shop= parameter");
}

try {
const authUrl = await shopify.auth.begin({
shop,
callbackPath: "/auth/callback",
isOnline: false,
rawRequest: req,
rawResponse: res,
});

return res.redirect(authUrl);
} catch (error) {
console.error("Auth begin error:", error);
return res.status(500).send("Failed to start auth");
}
});

/**
* OAuth callback
*/
app.get("/auth/callback", async (req, res) => {
try {
const { session } = await shopify.auth.callback({
rawRequest: req,
rawResponse: res,
});

console.log("Shop authenticated:", session.shop);

// Redirect back to Shopify Admin Apps page
return res.redirect(`https://${session.shop}/admin/apps`);
} catch (error) {
console.error("Auth callback error:", error);
return res.status(500).send("Authentication failed");
}
});

/**
* ============================
* SERVER START
* ============================
*/
app.listen(PORT, () => {
console.log(`EAS COD server running on port ${PORT}`);
});
