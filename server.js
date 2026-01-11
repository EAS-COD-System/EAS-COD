import express from "express";
import { initShopify } from "./shopify.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Shopify API
const shopify = initShopify();

/**
* Health check
*/
app.get("/", (req, res) => {
res.status(200).send("EAS COD app is running ✅");
});

/**
* Start OAuth
* /auth?shop=your-store.myshopify.com
return res.redirect(`https://${session.shop}/admin/apps`);
} catch (error) {
console.error("Auth callback error:", error);
return res.status(500).send("Authentication failed");
}
});

app.listen(PORT, () => {
console.log(`EAS COD server running on port ${PORT}`);
});
