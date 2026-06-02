import { buildStoreConfig } from "./geo-currency.js";
import { productName } from "./product-category.js";
import {
  ADMIN_CATEGORIES,
  applyOverridesToList,
  getOverridesStorageMode,
  getProductOverride,
  loadOverrides,
  normalizeCategoryList,
  setProductOverride,
} from "./product-overrides.js";
import {
  bearerToken,
  clearLoginAttempts,
  createSession,
  destroyToken,
  getAdminCredentials,
  isLoginRateLimited,
  recordFailedLogin,
  requireAdmin,
  validateToken,
  verifyCredentials,
} from "./admin-auth.js";

function parseImageUrl(product) {
  const raw =
    product.bigImage ?? product.productImage ?? product.productImageSet?.[0];
  if (!raw) return "";
  if (Array.isArray(raw)) return raw[0] ?? "";
  if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr[0] ?? "" : raw;
    } catch {
      return raw;
    }
  }
  return raw;
}

function parseCjSellPriceUsd(sellPrice) {
  if (sellPrice == null || sellPrice === "") return null;
  const part = String(sellPrice).split("-")[0].trim();
  const n = parseFloat(part);
  return Number.isFinite(n) ? n : null;
}

/** Raw CJ Dropshipping catalog price (USD). */
function formatCjPriceRaw(sellPrice) {
  if (sellPrice == null || sellPrice === "") return "";
  const s = String(sellPrice).trim();
  if (s.includes("-")) {
    const [low, high] = s.split("-").map((p) => p.trim());
    if (low && high) return `$${low}–$${high}`;
    if (low) return `$${low}`;
  }
  return `$${s}`;
}

function formatStorePrice(sellPrice, storeConfig) {
  const base = parseCjSellPriceUsd(sellPrice);
  if (base == null || !storeConfig) return "";
  const local = (base + storeConfig.priceAddOnUsd) * storeConfig.rate;
  try {
    return new Intl.NumberFormat(storeConfig.locale, {
      style: "currency",
      currency: storeConfig.currency,
      currencyDisplay: "narrowSymbol",
    }).format(local);
  } catch {
    return `${storeConfig.currency} ${local.toFixed(2)}`;
  }
}

export function toAdminProduct(product, storeConfig) {
  const pid = String(product.pid ?? product.productId ?? "");
  const override = getProductOverride(pid);
  const merged = applyOverridesToList([product])[0];
  const cjPriceDisplay = formatCjPriceRaw(product.sellPrice);

  const catalogName = productName(product);

  return {
    pid,
    sku: product.productSku ?? product.sku ?? "",
    name: merged.adminTitle || catalogName,
    catalogName,
    image: parseImageUrl(product),
    sellPrice: product.sellPrice,
    cjPriceDisplay,
    priceDisplay:
      merged.adminPriceDisplay ||
      formatStorePrice(product.sellPrice, storeConfig) ||
      cjPriceDisplay ||
      "—",
    categories: merged.adminCategories ?? [merged.adminCategory].filter(Boolean),
    category: merged.adminCategories?.[0] ?? merged.adminCategory,
    hasOverride: Boolean(
      override &&
        (override.title ||
          override.priceDisplay ||
          override.categories?.length ||
          override.category)
    ),
  };
}

export function registerAdminRoutes(app, {
  fetchAllCatalog,
  requireApiKey,
  apiError,
  invalidateCatalogCache,
}) {
  app.post("/api/admin/login", (req, res) => {
    const clientKey =
      req.ip ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      "unknown";

    if (isLoginRateLimited(clientKey)) {
      return res.status(429).json({
        error: "Too many login attempts. Try again in a few minutes.",
      });
    }

    const { username, password } = req.body ?? {};
    if (!verifyCredentials(username, password)) {
      recordFailedLogin(clientKey);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    clearLoginAttempts(clientKey);
    const token = createSession(username);
    res.json({ success: true, token, user: username });
  });

  app.post("/api/admin/logout", (req, res) => {
    destroyToken(bearerToken(req));
    res.json({ success: true });
  });

  app.get("/api/admin/me", (req, res) => {
    const user = validateToken(bearerToken(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json({
      user,
      username: getAdminCredentials().username,
      overridesStorage: getOverridesStorageMode(),
    });
  });

  app.get("/api/product-overrides", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(loadOverrides());
  });

  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    if (!requireApiKey(res)) return;
    try {
      const storeConfig = await buildStoreConfig(req);
      const products = await fetchAllCatalog();
      const list = applyOverridesToList(products).map((p) =>
        toAdminProduct(p, storeConfig)
      );
      res.json({
        success: true,
        total: list.length,
        categories: ADMIN_CATEGORIES,
        products: list,
      });
    } catch (err) {
      apiError(res, err);
    }
  });

  app.patch("/api/admin/products/:pid", requireAdmin, (req, res) => {
    const { pid } = req.params;
    if (!pid) return res.status(400).json({ error: "Missing product id" });

    const { category, categories, priceDisplay, title } = req.body ?? {};
    const patch = {};

    if (categories !== undefined) {
      const list = normalizeCategoryList(
        Array.isArray(categories) ? categories : []
      );
      if (!list.length) {
        return res.status(400).json({ error: "Select at least one category" });
      }
      patch.categories = list;
    } else if (category !== undefined) {
      if (category && !ADMIN_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      patch.category = category;
    }

    if (priceDisplay !== undefined) patch.priceDisplay = priceDisplay;

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Title cannot be empty" });
      }
      if (trimmed.length > 200) {
        return res.status(400).json({ error: "Title is too long (max 200 characters)" });
      }
      patch.title = trimmed;
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    setProductOverride(pid, patch);
    invalidateCatalogCache?.();
    res.json({ success: true, override: getProductOverride(pid) });
  });
}
