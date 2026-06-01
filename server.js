import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Project root (same folder as index.html, css/, js/, shop.html, …)
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const isProd = process.env.NODE_ENV === "production";
const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// Render sits behind a reverse proxy
if (isProd) {
  app.set("trust proxy", 1);
}

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://babyhug.se",
  "https://www.babyhug.se",
];

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── CJ API helpers ────────────────────────────────────────────────

let cachedToken = null;
let tokenExpiresAt = 0;

const productsCache = new Map();
const PRODUCTS_CACHE_MS = 5 * 60 * 1000;

function requireApiKey(res) {
  if (process.env.CJ_API_KEY) return true;
  res.status(503).json({
    error: "Server misconfigured: CJ_API_KEY environment variable is not set.",
  });
  return false;
}

async function getCJToken() {
  if (!process.env.CJ_API_KEY) return null;
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const authRes = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
  });
  const authData = await authRes.json();
  cachedToken = authData?.data?.accessToken ?? null;
  if (cachedToken) tokenExpiresAt = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

function getCachedJson(key) {
  const hit = productsCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.data;
  productsCache.delete(key);
  return null;
}

function setCachedJson(key, data) {
  productsCache.set(key, { data, expires: Date.now() + PRODUCTS_CACHE_MS });
}

function apiError(res, err, status = 500) {
  console.error(err);
  res.status(status).json({
    error: status === 500 ? "Server error" : "Request failed",
    ...(isProd ? {} : { detail: err?.message ?? String(err) }),
  });
}

// ── Health (Render uses this to know the service is up) ───────────

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: isProd ? "production" : "development",
    hasApiKey: Boolean(process.env.CJ_API_KEY),
  });
});

// ── API routes (must come before static files) ────────────────────

app.get("/api/products", async (req, res) => {
  if (!requireApiKey(res)) return;

  try {
    const token = await getCJToken();
    if (!token) {
      return res.status(502).json({ error: "Could not get CJ access token" });
    }

    const pageNum = req.query.pageNum ?? "1";
    const pageSize = req.query.pageSize ?? "24";
    const cacheKey = `products:${pageNum}:${pageSize}:${req.query.keyword ?? ""}`;
    const cached = getCachedJson(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=120");
      return res.json(cached);
    }

    const params = new URLSearchParams({ pageNum, pageSize });
    if (req.query.keyword) params.set("keyword", req.query.keyword);

    const productRes = await fetch(
      `${CJ_BASE}/product/myProduct/query?${params}`,
      { headers: { "CJ-Access-Token": token } }
    );
    const productData = await productRes.json();
    if (productData?.success) setCachedJson(cacheKey, productData);
    res.setHeader("Cache-Control", "public, max-age=120");
    res.json(productData);
  } catch (err) {
    apiError(res, err);
  }
});

app.get("/api/product", async (req, res) => {
  if (!requireApiKey(res)) return;

  try {
    const token = await getCJToken();
    if (!token) {
      return res.status(502).json({ error: "Could not get CJ access token" });
    }

    const pid = req.query.pid;
    const productSku = req.query.sku ?? req.query.productSku;
    if (!pid && !productSku) {
      return res.status(400).json({ error: "Provide pid or sku query parameter" });
    }

    const params = new URLSearchParams();
    if (pid) params.set("pid", pid);
    else params.set("productSku", productSku);

    const detailRes = await fetch(`${CJ_BASE}/product/query?${params}`, {
      headers: { "CJ-Access-Token": token },
    });
    const detailData = await detailRes.json();
    res.setHeader("Cache-Control", "public, max-age=120");
    res.json(detailData);
  } catch (err) {
    apiError(res, err);
  }
});

// ── Friendly URLs ─────────────────────────────────────────────────

app.get(["/shop", "/shop/"], (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/shop.html${query}`);
});

app.get(["/product", "/product/"], (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/product.html${query}`);
});

// ── Static frontend (index.html, css/, js/, images, …) ───────────

app.use(
  express.static(ROOT_DIR, {
    index: "index.html",
    extensions: ["html"],
    maxAge: isProd ? "7d" : 0,
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", isProd ? "public, max-age=3600" : "no-cache");
      } else if (/\.(js|css)$/.test(filePath)) {
        res.setHeader("Cache-Control", isProd ? "public, max-age=604800" : "no-cache");
      }
    },
  })
);

// Unknown paths → simple 404 (express.static calls next() when file not found)
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.status(404).send("Page not found");
});

// ── Start server ──────────────────────────────────────────────────

const server = app.listen(PORT, HOST, () => {
  console.log(`Baby Hug server listening on ${HOST}:${PORT}`);
  console.log(`Serving static files from: ${ROOT_DIR}`);
  console.log(`Environment: ${isProd ? "production" : "development"}`);
  if (!process.env.CJ_API_KEY) {
    console.warn("WARNING: CJ_API_KEY is not set — /api/products will return 503");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
