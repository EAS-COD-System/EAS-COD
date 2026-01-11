import shopifyApi from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

const {
SHOPIFY_API_KEY,
SHOPIFY_API_SECRET,
SCOPES,
APP_URL,
} = process.env;

// ---- SAFETY CHECKS (NO CRASH) ----
if (!SHOPIFY_API_KEY) {
console.warn("⚠️ SHOPIFY_API_KEY is missing");
}
if (!SHOPIFY_API_SECRET) {
console.warn("⚠️ SHOPIFY_API_SECRET is missing");
}
if (!APP_URL) {
console.warn("⚠️ APP_URL is missing");
}

// ---- INIT SHOPIFY ----
export function initShopify() {
return shopifyApi.shopifyApi({
apiKey: SHOPIFY_API_KEY || "",
apiSecretKey: SHOPIFY_API_SECRET || "",
scopes: (SCOPES || "")
.split(",")
.map(s => s.trim())
.filter(Boolean),
hostName: APP_URL
? APP_URL.replace(/^https?:\/\//, "")
: "localhost",
apiVersion: shopifyApi.LATEST_API_VERSION,
isEmbeddedApp: true,
sessionStorage: new shopifyApi.session.MemorySessionStorage(),
});
}
