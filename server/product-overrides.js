import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { inferAdminCategory } from "./product-category.js";
import { getAdminFirestore, isFirebaseAdminEnabled } from "./firebase-admin.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OVERRIDES_PATH =
  process.env.PRODUCT_OVERRIDES_PATH ||
  path.join(ROOT, "data", "product-overrides.json");

const OVERRIDES_DOC_PATH = "admin/productOverrides";

export const ADMIN_CATEGORIES = [
  "Boy",
  "Girl",
  "Childrens toys",
  "Sale",
  "New in",
  "Best sellers",
];

export const ADMIN_CATEGORY_TO_FILTER = {
  Boy: "Boy",
  Girl: "Girl",
  "Childrens toys": "Toys",
  Sale: "Sale",
  "New in": "New Arrival",
  "Best sellers": "Best Seller",
};

const defaultData = () => ({ products: {} });

let cache = null;

function readFile() {
  try {
    const raw = fs.readFileSync(OVERRIDES_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!data.products || typeof data.products !== "object") {
      return defaultData();
    }
    return data;
  } catch (err) {
    if (err.code === "ENOENT") return defaultData();
    throw err;
  }
}

function writeFileOnly(data) {
  const dir = path.dirname(OVERRIDES_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function loadFromFirestore() {
  const db = getAdminFirestore();
  if (!db) return null;

  const snap = await db.doc(OVERRIDES_DOC_PATH).get();
  if (!snap.exists) return defaultData();

  const data = snap.data();
  if (!data?.products || typeof data.products !== "object") {
    return defaultData();
  }
  return { products: data.products };
}

async function saveToFirestore(data) {
  const db = getAdminFirestore();
  if (!db) return false;
  await db.doc(OVERRIDES_DOC_PATH).set(
    { products: data.products, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return true;
}

/** Load overrides from Firestore (if configured) or local JSON. Call once at server start. */
export async function initOverridesStore() {
  if (isFirebaseAdminEnabled()) {
    try {
      const fromCloud = await loadFromFirestore();
      const fileData = readFile();
      const cloudCount = Object.keys(fromCloud?.products ?? {}).length;
      const fileCount = Object.keys(fileData.products ?? {}).length;

      if (cloudCount > 0) {
        cache = fromCloud;
        writeFileOnly(fromCloud);
        console.log(
          `[Overrides] Loaded ${cloudCount} product override(s) from Firestore`
        );
        return;
      }

      if (fileCount > 0) {
        cache = fileData;
        await saveToFirestore(fileData);
        console.log(
          `[Overrides] Seeded Firestore from file (${fileCount} product(s))`
        );
        return;
      }

      cache = defaultData();
      console.log("[Overrides] Firestore connected (empty catalog overrides)");
      return;
    } catch (err) {
      console.warn("[Overrides] Firestore load failed, using file:", err.message);
    }
  }

  cache = readFile();
  console.log(
    `[Overrides] Using local file (${Object.keys(cache.products ?? {}).length} product(s))`
  );
}

export function getOverridesStorageMode() {
  return isFirebaseAdminEnabled() && getAdminFirestore()
    ? "firestore"
    : "file";
}

export function loadOverrides() {
  if (!cache) cache = readFile();
  return cache;
}

export function invalidateOverridesCache() {
  cache = null;
}

export function saveOverrides(data) {
  writeFileOnly(data);
  cache = data;

  if (isFirebaseAdminEnabled()) {
    saveToFirestore(data).catch((err) => {
      console.warn("[Overrides] Firestore save failed:", err.message);
    });
  }

  return data;
}

export function normalizeCategoryList(categories) {
  if (!Array.isArray(categories)) return [];
  return [...new Set(categories.filter((c) => ADMIN_CATEGORIES.includes(c)))];
}

function overrideCategories(override) {
  if (!override) return null;
  if (Array.isArray(override.categories) && override.categories.length) {
    return normalizeCategoryList(override.categories);
  }
  if (override.category) return [override.category];
  return null;
}

export function resolveProductCategories(product, override) {
  const fromOverride = overrideCategories(override);
  if (fromOverride?.length) return fromOverride;
  return [inferAdminCategory(product)];
}

export function getProductOverride(pid) {
  const data = loadOverrides();
  const raw = data.products[String(pid)] ?? null;
  if (!raw) return null;
  const categories = overrideCategories(raw);
  if (categories?.length && !raw.categories) {
    return { ...raw, categories };
  }
  return raw;
}

export function setProductOverride(pid, patch) {
  const data = loadOverrides();
  const key = String(pid);
  const prev = data.products[key] ?? {};
  const next = { ...prev };

  if (patch.categories !== undefined) {
    const list = normalizeCategoryList(
      Array.isArray(patch.categories) ? patch.categories : []
    );
    if (!list.length) {
      delete next.categories;
      delete next.category;
    } else {
      next.categories = list;
      delete next.category;
    }
  }

  if (patch.category !== undefined && patch.categories === undefined) {
    if (patch.category === "" || patch.category == null) {
      delete next.categories;
      delete next.category;
    } else if (ADMIN_CATEGORIES.includes(patch.category)) {
      next.categories = [patch.category];
      delete next.category;
    }
  }

  if (patch.priceDisplay !== undefined) {
    if (patch.priceDisplay === "" || patch.priceDisplay == null) {
      delete next.priceDisplay;
      delete next.priceLocal;
    } else {
      next.priceDisplay = String(patch.priceDisplay).trim();
      const num = parsePriceNumber(next.priceDisplay);
      if (num != null) next.priceLocal = num;
      else delete next.priceLocal;
    }
  }

  if (patch.title !== undefined) {
    const title = String(patch.title ?? "").trim();
    if (!title) delete next.title;
    else next.title = title;
  }

  if (Object.keys(next).length === 0) delete data.products[key];
  else data.products[key] = next;

  return saveOverrides(data);
}

export function parsePriceNumber(value) {
  if (value == null || value === "") return null;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function applyOverridesToProduct(product) {
  const pid = String(product.pid ?? product.productId ?? "");
  const o = pid ? getProductOverride(pid) : null;

  const out = { ...product };
  out.adminCategories = resolveProductCategories(product, o);
  out.adminCategory = out.adminCategories[0];
  if (o?.title) {
    out.adminTitle = o.title;
    out.nameEn = o.title;
    out.productNameEn = o.title;
  }
  if (o?.priceDisplay) out.adminPriceDisplay = o.priceDisplay;
  if (o?.priceLocal != null) out.adminPriceLocal = o.priceLocal;
  return out;
}

export function applyOverridesToList(products) {
  return products.map(applyOverridesToProduct);
}
