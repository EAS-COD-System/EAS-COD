import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import fetch from "node-fetch";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { initShopify } from "./shopify.js";
import { db } from "./db.js";

const app = express();
const shopify = initShopify();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------- helpers --------
function verifyProxySignature(req) {
  const { signature, ...rest } = req.query;
  if (!signature) return false;

  const msg = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join("");

  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(msg)
    .digest("hex");

  return digest === signature;
}

function normalizeCountry(c) {
  const m = {
    kenya: "KE",
    tanzania: "TZ",
    uganda: "UG",
    zambia: "ZM",
    zimbabwe: "ZW"
  };
  return m[c?.toLowerCase()] || c?.toUpperCase();
}

// -------- OAuth --------
app.get("/auth", async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.send("Missing shop");

  const redirect = await shopify.auth.begin({
    shop,
    callbackPath: "/auth/callback",
    isOnline: false,
    rawRequest: req,
    rawResponse: res
  });

  res.redirect(redirect);
});

app.get("/auth/callback", async (req, res) => {
  const { session } = await shopify.auth.callback({
    rawRequest: req,
    rawResponse: res
  });

  db.prepare(`
    INSERT OR REPLACE INTO sessions (shop, access_token, created_at)
    VALUES (?, ?, ?)
  `).run(session.shop, session.accessToken, new Date().toISOString());

  res.redirect(`https://${session.shop}/admin/apps`);
});

// -------- App Proxy (COD submit) --------
app.post("/proxy/submit", async (req, res) => {
  if (!verifyProxySignature(req)) return res.status(401).send("Invalid");

  const shop = req.query.shop;
  const session = db.prepare("SELECT * FROM sessions WHERE shop=?").get(shop);
  if (!session) return res.status(400).send("Not installed");

  const {
    variant_id,
    quantity,
    full_name,
    phone,
    address,
    city,
    country,
    price,
    currency
  } = req.body;

  const iso = normalizeCountry(country);
  const parsed = parsePhoneNumberFromString(phone, iso);
  if (!parsed || !parsed.isValid()) {
    return res.json({ ok: false, error: "Invalid phone number" });
  }

  const order = {
    order: {
      financial_status: "pending",
      currency,
      line_items: [
        {
          variant_id: Number(variant_id),
          quantity: Number(quantity),
          price: String(Math.round(price))
        }
      ],
      shipping_address: {
        name: full_name,
        phone: parsed.number,
        address1: address,
        city,
        country_code: iso
      }
    }
  };

  const r = await fetch(`https://${shop}/admin/api/2025-01/orders.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": session.access_token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order)
  });

  const data = await r.json();
  if (!r.ok) return res.json({ ok: false, error: data });

  res.json({
    ok: true,
    redirect: process.env.THANK_YOU_URL
  });
});

app.get("/", (_, res) => res.send("EAS COD APP RUNNING"));

app.listen(process.env.PORT || 3000);
