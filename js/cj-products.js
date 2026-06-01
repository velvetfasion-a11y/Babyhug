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

export function productPageUrl(product) {
  const params = new URLSearchParams();
  if (product.productId) params.set("pid", product.productId);
  if (product.sku || product.productSku) params.set("sku", product.sku || product.productSku);
  return `product.html?${params}`;
}

export function buildProductCard(product, cardClass = "cj-product-card") {
  console.log(product);
  const name = escapeHtml(productName(product));
  const image = escapeHtml(parseImageUrl(product));
  const price = escapeHtml(formatDisplayPrice(product.sellPrice));
  const href = productPageUrl(product);

  return `
    <a href="${href}" class="${cardClass}" role="listitem">
      <div class="${cardClass}-img">
        <img src="${image}" alt="${name}" width="400" height="500" loading="lazy" />
      </div>
      <div class="${cardClass}-info">
        <h3 class="${cardClass}-name">${name}</h3>
        <p class="${cardClass}-price">${price}</p>
      </div>
    </a>
  `;
}

export async function fetchCJProducts(pageSize = 68) {
  const res = await fetch(`/api/products?pageNum=1&pageSize=${pageSize}`);
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`API ${res.status}: ${raw.slice(0, 200)}`);
  }
  const data = await res.json();
  console.log("Full CJ products response:", data);
  return {
    products: data?.data?.content ?? [],
    total: data?.data?.totalRecords ?? 0,
  };
}

export async function loadCJProducts() {
  const container = document.getElementById("cj-products-grid");
  if (!container) return;

  try {
    const { products, total } = await fetchCJProducts(24);

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
    container.innerHTML = `<p class="cj-error">Could not load products. Run <code>npm run dev</code> and open <a href="http://localhost:3000">localhost:3000</a>.</p>`;
  }
}
