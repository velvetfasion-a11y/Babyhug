import { apiUrl } from "./config.js";
import { loadWhenVisible } from "./perf.js";
import { t } from "./i18n.js";
import { formatStorePrice, storePriceNumber } from "./currency.js";
import { isInWishlist, toggleWishlist } from "./wishlist.js";

export { parseCjPrice } from "./currency.js";

/** CJ list items use productId/sku — keep string ids (never Number; loses precision). */
export function normalizeListProduct(product) {
  if (!product) return product;
  const productId =
    product.productId != null
      ? String(product.productId)
      : product.pid != null
        ? String(product.pid)
        : "";
  const sku =
    product.productSku != null
      ? String(product.productSku)
      : product.sku != null
        ? String(product.sku)
        : "";
  return {
    ...product,
    productId,
    pid: productId,
    sku,
    productSku: sku,
  };
}

export function productIds(product) {
  const p = normalizeListProduct(product);
  return { pid: p.pid, sku: p.sku };
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseImageUrl(product) {
  const raw =
    product.bigImage ??
    product.productImage ??
    product.productImageSet?.[0];
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

function parseCjName(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return String(arr[0] ?? "");
    } catch {
      /* use raw string */
    }
  }
  return String(value);
}

export function productName(product) {
  if (product?.adminTitle) return String(product.adminTitle).trim();

  const fromSet = Array.isArray(product.productNameSet)
    ? product.productNameSet[0]
    : null;

  return (
    parseCjName(fromSet) ||
    parseCjName(product.nameEn) ||
    parseCjName(product.productNameEn) ||
    parseCjName(product.productName) ||
    product.sku ||
    "Product"
  );
}

/** CJ price in visitor's currency (USD base + markup, converted). */
export function formatDisplayPrice(sellPrice, product) {
  if (product?.adminPriceDisplay) return product.adminPriceDisplay;
  return formatStorePrice(sellPrice);
}

export function formatProductPrice(product) {
  return formatDisplayPrice(product?.sellPrice ?? product?.price, product);
}

export function priceNumber(product) {
  if (product?.adminPriceLocal != null) return product.adminPriceLocal;
  return storePriceNumber(product.sellPrice ?? product.price);
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

function productSearchText(product) {
  return `${productName(product)} ${productCategoryText(product)}`.toLowerCase();
}

/** Word-boundary match so "bowknot" does not count as Boy. */
export function isBoyProduct(product) {
  return /\bboys?\b/.test(productSearchText(product));
}

export function isGirlProduct(product) {
  return /\bgirls?\b/.test(productSearchText(product));
}

export function isBoyOrGirlProduct(product) {
  return isBoyProduct(product) || isGirlProduct(product);
}

/** Boy / girl items for homepage carousel (alternates when possible). */
export function pickBoyGirlCarousel(products, limit = 12) {
  const boys = products.filter((p) => isBoyProduct(p) && !isGirlProduct(p));
  const girls = products.filter((p) => isGirlProduct(p) && !isBoyProduct(p));
  const both = products.filter((p) => isBoyProduct(p) && isGirlProduct(p));
  const picked = [];
  let bi = 0;
  let gi = 0;

  while (picked.length < limit && (bi < boys.length || gi < girls.length)) {
    if (bi < boys.length) picked.push(boys[bi++]);
    if (picked.length >= limit) break;
    if (gi < girls.length) picked.push(girls[gi++]);
  }

  for (const p of both) {
    if (picked.length >= limit) break;
    if (!picked.includes(p)) picked.push(p);
  }

  return picked.slice(0, limit);
}

const TOY_PATTERN =
  /\b(toy|toys|plush|doll|dolls|puzzle|game|games|playset|stuffed|teddy|bear|rattle|teether|blocks|lego|figurine|mobile|playmat)\b/i;

const CLOTHING_PATTERN =
  /\b(romper|onesie|dress|shirt|pants|jacket|coat|outfit|clothing|bodysuit|jumpsuit|footie|sleeper|swaddle|bib|sock|shoes|sneaker|hat|bonnet|skirt|vest|cardigan|sweater|pajama|pyjama|wear|apparel|garment|knit|woven)\b/i;

export function isOnSale(product) {
  if (product.discountPrice != null && product.discountPrice !== "") return true;
  if (Number(product.discountPriceRate) > 0) return true;

  const name = productName(product).toLowerCase();
  if (/\b(sale|clearance|discount|markdown|off)\b/.test(name)) return true;

  return false;
}

function isToyProduct(product) {
  const text = `${productName(product)} ${productCategoryText(product)}`;
  if (TOY_PATTERN.test(text)) return true;
  if (/\b(educational|learning|montessori)\b/i.test(text) && /\b(baby|kid|child|toddler)\b/i.test(text)) {
    return true;
  }
  return false;
}

function isClothingProduct(product) {
  const text = `${productName(product)} ${productCategoryText(product)}`;
  return CLOTHING_PATTERN.test(text) || /\b(baby|infant|newborn|toddler)\b/i.test(text);
}

const ADMIN_CATEGORY_TO_FILTER = {
  Boy: "Boy",
  Girl: "Girl",
  "Childrens toys": "Toys",
  Sale: "Sale",
  "New in": "New Arrival",
  "Best sellers": "Best Seller",
};

function productAdminCategories(product) {
  if (Array.isArray(product.adminCategories) && product.adminCategories.length) {
    return product.adminCategories;
  }
  if (product.adminCategory) return [product.adminCategory];
  return [];
}

function adminCategoryMatchesFilter(categories, filter) {
  return categories.some((cat) => {
    const mapped = ADMIN_CATEGORY_TO_FILTER[cat];
    if (mapped) return mapped === filter;
    return cat === filter;
  });
}

/** Match shop filter buttons (Boy, Girl, Sale, etc.) against CJ fields. */
export function productMatchesFilter(product, filter) {
  if (!filter || filter === "all") return true;

  const adminCats = productAdminCategories(product);
  if (adminCats.length) {
    return adminCategoryMatchesFilter(adminCats, filter);
  }

  if (filter === "Boy") {
    return isBoyProduct(product);
  }
  if (filter === "Girl") {
    return isGirlProduct(product);
  }
  if (filter === "Boy-Girl") return isBoyOrGirlProduct(product);

  if (filter === "Toys") return isToyProduct(product);

  if (filter === "Sale") return isOnSale(product);

  const name = productName(product).toLowerCase();
  const cat = productCategoryText(product);

  const q = filter.toLowerCase();
  return name.includes(q) || cat.includes(q);
}

/** Snapshot for profile wishlist storage. */
export function productToWishlistItem(product) {
  const pid = product.pid ?? product.productId;
  const sku = product.productSku ?? product.sku;
  const id = pid ? `cj-${pid}` : sku ? `cj-${sku}` : null;
  return {
    id,
    pid: pid ? String(pid) : undefined,
    sku: sku ? String(sku) : undefined,
    name: productName(product),
    image: parseImageUrl(product),
    price: priceNumber(product),
    category: product.adminCategories?.[0] ?? product.adminCategory ?? "",
    href: productPageUrl(product),
  };
}

export function productPageUrl(product) {
  const params = new URLSearchParams();
  const { pid, sku } = productIds(product);
  if (pid) params.set("pid", pid);
  if (sku) params.set("sku", sku);
  const qs = params.toString();
  return qs ? `product.html?${qs}` : "product.html";
}

/** Cherished Keepsakes horizontal carousel (matches .product-card styles). */
export function buildCarouselCard(product) {
  const name = escapeHtml(productName(product));
  const image = escapeHtml(parseImageUrl(product));
  const price = escapeHtml(formatProductPrice(product));
  const href = productPageUrl(product);
  const badge = isOnSale(product)
    ? `<span class="product-badge">${escapeHtml(t("badge.sale"))}</span>`
    : "";

  return `
    <a href="${href}" class="product-card" role="listitem" data-pid="${escapeHtml(String(product.pid ?? product.productId ?? ""))}" data-sku="${escapeHtml(String(product.productSku ?? product.sku ?? ""))}">
      <div class="product-image-wrap">
        <img src="${image}" alt="${name}" width="440" height="440" loading="lazy" decoding="async" />
        ${badge}
      </div>
      <h3 class="product-name">${name}</h3>
      <p class="product-price">${price}</p>
    </a>
  `;
}

function wishlistButtonHtml(product) {
  const pid = product.pid ?? product.productId;
  const item = productToWishlistItem(product);
  const saved = isInWishlist(item);
  return `<button type="button" class="wishlist-btn${saved ? " is-saved" : ""}" data-wishlist-pid="${escapeHtml(String(pid))}" aria-label="${escapeHtml(t("profile.saveWishlist"))}">♥</button>`;
}

export function attachWishlistButtons(root, products) {
  if (!root) return;
  root.querySelectorAll(".wishlist-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pid = btn.dataset.wishlistPid;
      const product = products.find(
        (p) => String(p.productId ?? p.pid) === String(pid)
      );
      if (!product) return;
      const item = productToWishlistItem(product);
      toggleWishlist(item);
      btn.classList.toggle("is-saved", isInWishlist(item));
    });
  });
}

export function buildProductCard(product, cardClass = "cj-product-card") {
  const name = escapeHtml(productName(product));
  const image = escapeHtml(parseImageUrl(product));
  const price = escapeHtml(formatProductPrice(product));
  const href = productPageUrl(product);

  const pid = product.pid ?? product.productId ?? "";
  const sku = product.productSku ?? product.sku ?? "";
  const wishBtn =
    cardClass === "shop-card" ? wishlistButtonHtml(product) : "";

  return `
    <a href="${href}" class="${cardClass}" role="listitem" data-pid="${escapeHtml(String(pid))}" data-sku="${escapeHtml(String(sku))}">
      <div class="${cardClass}-img">
        ${wishBtn}
        <img src="${image}" alt="${name}" width="400" height="500" loading="lazy" decoding="async" />
      </div>
      <div class="${cardClass}-info">
        <h3 class="${cardClass}-name">${name}</h3>
        <p class="${cardClass}-price">${price}</p>
      </div>
    </a>
  `;
}

export function attachProductCardPrefetch(root = document) {
  root.querySelectorAll(".shop-card[data-pid], .cj-product-card[data-pid], .product-card[data-pid]").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      prefetchProductDetail({
        productId: card.dataset.pid,
        sku: card.dataset.sku,
      });
    }, { passive: true });
  });
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

  const products = (data?.data?.content ?? []).map(normalizeListProduct);
  return {
    products,
    total: data?.data?.totalRecords ?? 0,
    raw: data,
  };
}

let catalogPromise = null;

/** Full catalog — one fast server request (cached). */
export async function fetchAllCJProducts() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const res = await fetch(apiUrl("/api/products/all"));
      const raw = await res.text();
      if (!res.ok) {
        catalogPromise = null;
        const err = new Error(`API ${res.status}`);
        err.status = res.status;
        err.body = raw;
        throw err;
      }
      const data = JSON.parse(raw);
      const products = (data?.data?.content ?? []).map(normalizeListProduct);
      return { products, total: data?.data?.totalRecords ?? products.length };
    })();
  }
  return catalogPromise;
}

const detailPrefetch = new Map();

/** Warm product detail cache when hovering a card. */
export function prefetchProductDetail(product) {
  const pid = product.pid ?? product.productId;
  const sku = product.productSku ?? product.sku;
  if (!pid && !sku) return;

  const key = `${pid}:${sku}`;
  if (detailPrefetch.has(key)) return;

  const params = new URLSearchParams();
  if (pid) params.set("pid", String(pid));
  if (sku) params.set("sku", String(sku));

  detailPrefetch.set(
    key,
    fetch(apiUrl(`/api/product?${params}`), { priority: "low" }).catch(() => {})
  );
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
      container.innerHTML = `<p>${escapeHtml(t("loading.noCatalog"))}</p>`;
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
