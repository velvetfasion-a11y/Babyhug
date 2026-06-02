import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { buildStoreConfig } from "./server/geo-currency.js";
import {
  applyOverridesToList,
  initOverridesStore,
  invalidateOverridesCache,
} from "./server/product-overrides.js";
import { registerAdminRoutes } from "./server/admin-routes.js";

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
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

app.get("/api/store-config", async (req, res) => {
  try {
    const config = await buildStoreConfig(req);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.json(config);
  } catch (err) {
    apiError(res, err);
  }
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
    if (cached?.data?.content) {
      const merged = {
        ...cached,
        data: {
          ...cached.data,
          content: applyOverridesToList(cached.data.content),
        },
      };
      res.setHeader("Cache-Control", "public, max-age=120");
      return res.json(merged);
    }

    const params = new URLSearchParams({ pageNum, pageSize });
    if (req.query.keyword) params.set("keyword", req.query.keyword);

    const productRes = await fetch(
      `${CJ_BASE}/product/myProduct/query?${params}`,
      { headers: { "CJ-Access-Token": token } }
    );
    const productData = await productRes.json();
    if (productData?.data?.content) {
      productData.data.content = applyOverridesToList(productData.data.content);
    }
    if (productData?.success) setCachedJson(cacheKey, productData);
    res.setHeader("Cache-Control", "public, max-age=120");
    res.json(productData);
  } catch (err) {
    apiError(res, err);
  }
});

async function fetchAllCatalog() {
  const cacheKey = "products:all";
  const cached = getCachedJson(cacheKey);
  if (cached?.data?.content) return cached.data.content;

  const token = await getCJToken();
  if (!token) throw new Error("Could not get CJ access token");

  const firstParams = new URLSearchParams({ pageNum: "1", pageSize: "100" });
  const firstRes = await fetch(
    `${CJ_BASE}/product/myProduct/query?${firstParams}`,
    { headers: { "CJ-Access-Token": token } }
  );
  const firstData = await firstRes.json();
  const totalRecords = firstData?.data?.totalRecords ?? 0;
  const totalPages = Math.ceil(totalRecords / 100) || 1;
  const all = [...(firstData?.data?.content ?? [])];

  if (totalPages > 1) {
    const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const rest = await Promise.all(
      pageNums.map(async (pageNum) => {
        const params = new URLSearchParams({
          pageNum: String(pageNum),
          pageSize: "100",
        });
        const r = await fetch(
          `${CJ_BASE}/product/myProduct/query?${params}`,
          { headers: { "CJ-Access-Token": token } }
        );
        const json = await r.json();
        return json?.data?.content ?? [];
      })
    );
    for (const chunk of rest) all.push(...chunk);
  }

  const payload = {
    code: 200,
    success: true,
    message: "Success",
    data: { content: all, totalRecords: all.length },
  };
  setCachedJson(cacheKey, payload);
  return all;
}

/** Full catalog in one response (server fetches pages in parallel, cached). */
app.get("/api/products/all", async (req, res) => {
  if (!requireApiKey(res)) return;

  try {
    const all = await fetchAllCatalog();
    const merged = applyOverridesToList(all);
    const payload = {
      code: 200,
      success: true,
      message: "Success",
      data: { content: merged, totalRecords: merged.length },
    };
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(payload);
  } catch (err) {
    apiError(res, err);
  }
});

function invalidateCatalogCache() {
  productsCache.clear();
  detailCache.clear();
  invalidateOverridesCache();
}

registerAdminRoutes(app, {
  fetchAllCatalog,
  requireApiKey,
  apiError,
  invalidateCatalogCache,
});

const detailCache = new Map();
const DETAIL_CACHE_MS = 10 * 60 * 1000;

async function fetchCjProductDetail(token, pid, productSku) {
  const attempts = [];
  if (pid) attempts.push(new URLSearchParams({ pid: String(pid) }));
  if (productSku) attempts.push(new URLSearchParams({ productSku: String(productSku) }));

  for (const params of attempts) {
    const detailRes = await fetch(`${CJ_BASE}/product/query?${params}`, {
      headers: { "CJ-Access-Token": token },
    });
    const detailData = await detailRes.json();
    const ok =
      detailData?.data &&
      (detailData.success === true ||
        detailData.result === true ||
        Number(detailData.code) === 200);
    if (ok) return detailData;
  }
  return null;
}

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

    const detailCacheKey = `${pid ?? ""}:${productSku ?? ""}`;
    const hit = detailCache.get(detailCacheKey);
    if (hit && Date.now() < hit.expires) {
      res.setHeader("Cache-Control", "public, max-age=120");
      return res.json(hit.data);
    }

    const detailData = await fetchCjProductDetail(token, pid, productSku);
    res.setHeader("Cache-Control", "public, max-age=120");

    if (!detailData) {
      return res.status(404).json({
        success: false,
        error: "Product not found in CJ catalog",
        pid,
        productSku,
      });
    }

    const merged = {
      ...detailData,
      data: applyOverridesToList([detailData.data])[0],
    };

    detailCache.set(detailCacheKey, {
      data: merged,
      expires: Date.now() + DETAIL_CACHE_MS,
    });
    res.json(merged);
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

app.get(["/profile", "/profile/"], (_req, res) => {
  res.redirect(302, "/profile.html");
});

// ── HTML pages (explicit routes so product.html is always served) ─

const HTML_PAGES = [
  "index.html",
  "shop.html",
  "product.html",
  "profile.html",
  "admin.html",
];

for (const file of HTML_PAGES) {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(ROOT_DIR, file));
  });
}

// ── Static frontend (css/, js/, …) ───────────────────────────────

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
        res.setHeader(
          "Cache-Control",
          isProd ? "public, max-age=86400, must-revalidate" : "no-cache"
        );
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

await initOverridesStore();

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
