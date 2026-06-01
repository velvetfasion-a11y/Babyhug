import { apiUrl } from "./config.js";
import { loadWhenVisible } from "./perf.js";

export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseImageUrl(product) {
  const raw = product.bigImage ?? product.productImage ?? product.productImageSet?.[0];
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

export function productName(product) {
  return (
    product.nameEn ??
    product.productNameEn ??
    product.productName ??
    product.sku ??
    "Product"
  );
}

/** Flat amount added to every CJ price for store pricing */
export const PRICE_ADD_ON = 15;

/** Base CJ price (handles ranges like "4.01-7.02" by using the first number) */
export function parseCjPrice(sellPrice) {
  if (sellPrice == null || sellPrice === "") return null;
  const n = parseFloat(String(sellPrice).split("-")[0]);
  return Number.isNaN(n) ? null : n;
}

/** CJ price + $15, with dollar sign — use everywhere products are shown */
export function formatDisplayPrice(sellPrice) {
  const base = parseCjPrice(sellPrice);
  if (base == null) return "";
  const displayPrice = base + PRICE_ADD_ON;
  return `$${displayPrice.toFixed(2)}`;
}

export function priceNumber(product) {
  const base = parseCjPrice(product.sellPrice ?? product.price);
  if (base == null) return 0;
  return base + PRICE_ADD_ON;
}

/** @deprecated use formatDisplayPrice */
export function formatSellPrice(sellPrice) {
  return formatDisplayPrice(sellPrice);
}

function productCategoryText(product) {
  return [
    product.categoryFirstName,
    product.categorySecondName,
    product.categoryThreeName,
    product.categoryName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Match shop filter buttons (Boy, Girl, Sale, etc.) against CJ fields. */
export function productMatchesFilter(product, filter) {
  if (!filter || filter === "all") return true;

  const name = productName(product).toLowerCase();
  const cat = productCategoryText(product);

  if (filter === "Sale") {
    return product.discountPrice != null && product.discountPrice !== "";
  }

  const q = filter.toLowerCase();
  return name.includes(q) || cat.includes(q);
}

export function productPageUrl(product) {
  const params = new URLSearchParams();
  const pid = product.pid ?? product.productId;
  const sku = product.productSku ?? product.sku;
  if (pid) params.set("pid", String(pid));
  if (sku) params.set("sku", String(sku));
  const qs = params.toString();
  return qs ? `/product.html?${qs}` : "/product.html";
}

/** Cherished Keepsakes horizontal carousel (matches .product-card styles). */
export function buildCarouselCard(product) {
  const name = escapeHtml(productName(product));
  const image = escapeHtml(parseImageUrl(product));
  const price = escapeHtml(formatDisplayPrice(product.sellPrice));
  const href = productPageUrl(product);
  const badge =
    product.discountPrice != null && product.discountPrice !== ""
      ? `<span class="product-badge">Sale</span>`
      : "";

  return `
    <a href="${href}" class="product-card" role="listitem">
      <div class="product-image-wrap">
        <img src="${image}" alt="${name}" width="440" height="440" loading="lazy" decoding="async" />
        ${badge}
      </div>
      <h3 class="product-name">${name}</h3>
      <p class="product-price">${price}</p>
    </a>
  `;
}

export function buildProductCard(product, cardClass = "cj-product-card") {
  const name = escapeHtml(productName(product));
  const image = escapeHtml(parseImageUrl(product));
  const price = escapeHtml(formatDisplayPrice(product.sellPrice));
  const href = productPageUrl(product);

  return `
    <a href="${href}" class="${cardClass}" role="listitem">
      <div class="${cardClass}-img">
        <img src="${image}" alt="${name}" width="400" height="500" loading="lazy" decoding="async" />
      </div>
      <div class="${cardClass}-info">
        <h3 class="${cardClass}-name">${name}</h3>
        <p class="${cardClass}-price">${price}</p>
      </div>
    </a>
  `;
}

export async function fetchCJProducts(pageSize = 68, pageNum = 1) {
  const url = apiUrl(`/api/products?pageNum=${pageNum}&pageSize=${pageSize}`);
  const res = await fetch(url);
  const raw = await res.text();

  if (!res.ok) {
    const err = new Error(`API ${res.status}`);
    err.status = res.status;
    err.body = raw;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const err = new Error("API returned non-JSON (is the Node server running?)");
    err.status = res.status;
    err.body = raw;
    throw err;
  }

  return {
    products: data?.data?.content ?? [],
    total: data?.data?.totalRecords ?? 0,
    raw: data,
  };
}

/** Load every page from CJ (for Shop All). */
export async function fetchAllCJProducts(pageSize = 50) {
  const all = [];
  let pageNum = 1;
  let totalRecords = 0;

  while (pageNum <= 20) {
    const { products, total } = await fetchCJProducts(pageSize, pageNum);
    totalRecords = total || totalRecords;
    if (!products.length) break;
    all.push(...products);
    if (all.length >= totalRecords) break;
    pageNum += 1;
  }

  return { products: all, total: totalRecords || all.length };
}

/** User-facing message when /api/products fails. */
export function productsLoadErrorHtml(err) {
  const { protocol, hostname } = window.location;

  if (protocol === "file:") {
    return `<p class="cj-error">This page was opened as a file on your computer. Run <code>npm run dev</code>, then open <a href="http://localhost:3000/shop.html">http://localhost:3000/shop.html</a>.</p>`;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `<p class="cj-error">Could not load products from the API. Run <code>npm run dev</code> in the project folder. If you see “port already in use”, stop the old server with <code>lsof -ti:3000 | xargs kill</code>, then run <code>npm run dev</code> again and open <a href="http://localhost:3000/shop.html">http://localhost:3000/shop.html</a>.</p>`;
  }

  if (err?.status === 503 || String(err?.body ?? "").includes("CJ_API_KEY")) {
    return `<p class="cj-error">The server is running but <code>CJ_API_KEY</code> is missing. Add your CJ API key in your host’s environment variables (e.g. Render → Environment), then redeploy.</p>`;
  }

  if (
    err?.status === 404 ||
    String(err?.body ?? "").trimStart().startsWith("<!") ||
    String(err?.message ?? "").includes("non-JSON")
  ) {
    return `<p class="cj-error"><strong>${hostname}</strong> is not running the product API. Uploading HTML only is not enough — deploy the full project with <code>npm start</code> (see README: Render + <code>CJ_API_KEY</code>, then point your domain there).</p>`;
  }

  return `<p class="cj-error">Could not load products. Please try again in a moment.</p>`;
}

export async function loadCJProducts(pageSize = 12) {
  const container = document.getElementById("cj-products-grid");
  if (!container) return;

  try {
    const { products, total } = await fetchCJProducts(pageSize);

    if (!products.length) {
      container.innerHTML = "<p>No products in your CJ catalog yet.</p>";
      return;
    }

    const countEl = document.getElementById("cj-products-count");
    if (countEl) {
      countEl.textContent = `${total} product${total === 1 ? "" : "s"}`;
    }

    container.innerHTML = products.map((p) => buildProductCard(p)).join("");
  } catch (err) {
    console.error("Fetch failed:", err);
    container.innerHTML = productsLoadErrorHtml(err);
  }
}

/** Defer CJ API until the grid is near the viewport (faster first paint). */
export function initCJProductsLazy() {
  const section = document.querySelector(".cj-products-section");
  const grid = document.getElementById("cj-products-grid");
  if (!section || !grid) return;

  loadWhenVisible(section, () => loadCJProducts(12));
}
