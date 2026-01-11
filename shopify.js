// shopify.js
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";

function requireEnv(name) {
const v = process.env[name];
if (!v) throw new Error(`Missing env var: ${name}`);
return v;
}

export function initShopify() {
const appUrl = requireEnv("SHOPIFY_APP_URL"); // example: https://your-app.onrender.com
const hostName = new URL(appUrl).host;

const scopes = (process.env.SCOPES || "")
.split(",")
.map(s => s.trim())
.filter(Boolean);

if (scopes.length === 0) {
throw new Error("SCOPES env var is empty. Example: read_products,write_orders");
}

return shopifyApi({
apiKey: requireEnv("SHOPIFY_API_KEY"),
apiSecretKey: requireEnv("SHOPIFY_API_SECRET"),
scopes,
hostName,
apiVersion: LATEST_API_VERSION,
isEmbeddedApp: false,
});
}
