import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";

export function initShopify() {
  return shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SCOPES.split(","),
    hostName: new URL(process.env.APP_URL).host,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true
  });
}
