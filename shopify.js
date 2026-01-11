// shopify.js
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion, DeliveryMethod } from "@shopify/shopify-api";

/**
* Minimal in-memory session storage (works fine for testing + getting Render deploy green).
* NOTE: on Render free/starter, instances can restart -> sessions can be lost.
* Later you should move this to Redis/DB.
*/
class MemorySessionStorage {
constructor() {
this.sessions = new Map(); // key: sessionId, value: session
}

async storeSession(session) {
this.sessions.set(session.id, session);
return true;
}

async loadSession(id) {
return this.sessions.get(id) || undefined;
}

async deleteSession(id) {
return this.sessions.delete(id);
}

async deleteSessions(ids) {
ids.forEach((id) => this.sessions.delete(id));
return true;
}

async findSessionsByShop(shop) {
const results = [];
for (const session of this.sessions.values()) {
if (session.shop === shop) results.push(session);
}
return results;
}
}

export function initShopify() {
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecretKey = process.env.SHOPIFY_API_SECRET;

// Your Render public URL, example: https://eas-cod.onrender.com
const appUrl = process.env.SHOPIFY_APP_URL;
const hostName = appUrl ? appUrl.replace(/^https?:\/\//, "") : undefined;

// Safe scopes parsing (prevents your crash)
const scopesRaw =
process.env.SCOPES ||
process.env.SHOPIFY_SCOPES ||
"read_products,write_draft_orders,read_orders,write_orders";

const scopes = scopesRaw
.split(",")
.map((s) => s.trim())
.filter(Boolean);

if (!apiKey || !apiSecretKey || !appUrl || !hostName) {
throw new Error(
`Missing env vars. Required:
- SHOPIFY_API_KEY
- SHOPIFY_API_SECRET
- SHOPIFY_APP_URL (example: https://eas-cod.onrender.com)
`
);
}

const shopify = shopifyApi({
apiKey,
apiSecretKey,
scopes,
hostName,
apiVersion: ApiVersion.January25, // safe modern version
isEmbeddedApp: true,
sessionStorage: new MemorySessionStorage(),
// If you later add webhooks:
// webhooks: { ... }
});

return shopify;
}

export { DeliveryMethod };
