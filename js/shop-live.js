/**
 * Shop page: CJ catalog (primary) + optional real-time Firestore `products` overlay.
 */
import {
  attachProductCardPrefetch,
  attachWishlistButtons,
  buildProductCard,
  fetchAllCJProducts,
  priceNumber,
  productMatchesFilter,
  productName,
  productsLoadErrorHtml,
} from "./cj-products.js";
import { initCart } from "./cart.js";
import { whenIdle } from "./perf.js";
import { t } from "./i18n.js";
import { bootstrap } from "./bootstrap.js";

/** @type {HTMLElement | null} */
let gridEl = null;

let allProducts = [];
let activeFilter = "all";
let sortValue = "default";
let cjLoadStarted = false;
let cjLoadDone = false;
let unsubscribeFirestore = null;

function getProductGrid() {
  return (
    document.getElementById("product-grid") ||
    document.getElementById("shop-grid")
  );
}

function sortProducts(products, sort) {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => priceNumber(a) - priceNumber(b));
    case "price-desc":
      return list.sort((a, b) => priceNumber(b) - priceNumber(a));
    case "name-asc":
      return list.sort((a, b) => productName(a).localeCompare(productName(b)));
    case "name-desc":
      return list.sort((a, b) => productName(b).localeCompare(productName(a)));
    default:
      return list;
  }
}

/** Clear grid and render cards. */
export function renderProductGrid(products, filter = activeFilter, sort = sortValue) {
  gridEl = getProductGrid();
  const noResults = document.getElementById("shop-no-results");
  const countEl = document.getElementById("shop-count");
  if (!gridEl) return;

  activeFilter = filter;
  sortValue = sort;
  allProducts = products;

  let filtered = products;
  if (filter && filter !== "all") {
    filtered = products.filter((p) => productMatchesFilter(p, filter));
  }
  filtered = sortProducts(filtered, sort);

  gridEl.innerHTML = "";

  if (!filtered.length) {
    if (noResults) noResults.hidden = false;
    if (countEl) countEl.textContent = t("shop.productCountPlural", { count: 0 });
    return;
  }

  if (noResults) noResults.hidden = true;
  gridEl.innerHTML = filtered
    .map((p) => buildProductCard(p, "shop-card"))
    .join("");
  attachProductCardPrefetch(gridEl);
  attachWishlistButtons(gridEl, filtered);

  if (countEl) {
    countEl.textContent =
      filtered.length === 1
        ? t("shop.productCount", { count: filtered.length })
        : t("shop.productCountPlural", { count: filtered.length });
  }
}

async function loadCjCatalog() {
  if (cjLoadStarted) return;
  cjLoadStarted = true;
  gridEl = getProductGrid();
  if (!gridEl) return;

  try {
    const data = await fetchAllCJProducts();
    cjLoadDone = true;
    if (data.products.length > 0) {
      renderProductGrid(data.products, activeFilter, sortValue);
    } else if (!allProducts.length) {
      gridEl.innerHTML = `<p class="cj-loading">${t("loading.noCatalog")}</p>`;
    }
  } catch (err) {
    console.error("CJ catalog load failed:", err);
    cjLoadDone = true;
    if (!allProducts.length && gridEl) {
      gridEl.innerHTML = productsLoadErrorHtml(err);
    }
  }
}

async function startFirestoreListener() {
  try {
    const { listenToProductsCollection } = await import("./firestore-products-live.js");
    unsubscribeFirestore = listenToProductsCollection({
      onProducts: (products) => {
        if (products.length > 0) {
          renderProductGrid(products, activeFilter, sortValue);
        }
        // Empty Firestore: keep CJ catalog — do not clear the grid
      },
      onError: (err) => {
        console.warn("Firestore products listener failed:", err);
        if (!cjLoadDone) loadCjCatalog();
      },
    });
  } catch (err) {
    console.warn("Firestore products unavailable:", err);
  }
}

function getParamsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get("category") || null,
    badge: params.get("badge") || null,
  };
}

function syncActiveFilter(filter) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    const match =
      filter === "all"
        ? btn.dataset.filter === "all"
        : btn.dataset.filter === filter;
    btn.classList.toggle("is-active", match);
  });
}

function updateHeading(filter) {
  const el = document.getElementById("shop-heading");
  if (!el) return;
  const labelMap = {
    all: "shop.title",
    Boy: "shop.boy",
    Girl: "shop.girl",
    "Boy-Girl": "shop.boyGirl",
    Toys: "shop.toys",
    Sale: "shop.sale",
    "New Arrival": "shop.newIn",
    "Best Seller": "shop.bestSellers",
  };
  el.textContent = t(labelMap[filter] || "shop.title");
}

function initMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("mobile-nav");
  const close = document.querySelector(".mobile-nav-close");
  if (!toggle || !nav) return;

  const open = () => {
    nav.classList.add("is-open");
    document.body.style.overflow = "hidden";
  };
  const shut = () => {
    nav.classList.remove("is-open");
    document.body.style.overflow = "";
  };
  toggle.addEventListener("click", open);
  close?.addEventListener("click", shut);
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", shut));
}

function bindShopControls() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter || "all";
      syncActiveFilter(filter);
      updateHeading(filter);
      renderProductGrid(allProducts, filter, sortValue);
    });
  });

  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    sortValue = e.target.value;
    renderProductGrid(allProducts, activeFilter, sortValue);
  });

  document.getElementById("shop-clear-btn")?.addEventListener("click", () => {
    activeFilter = "all";
    sortValue = "default";
    const sel = document.getElementById("sort-select");
    if (sel) sel.value = "default";
    syncActiveFilter("all");
    updateHeading("all");
    renderProductGrid(allProducts, "all", "default");
  });
}

async function initShopLive() {
  gridEl = getProductGrid();
  if (!gridEl) return;

  const { category, badge } = getParamsFromUrl();
  activeFilter = category || badge || "all";

  gridEl.innerHTML = `<p class="cj-loading">${t("shop.loading")}</p>`;
  syncActiveFilter(activeFilter);
  updateHeading(activeFilter);
  bindShopControls();

  loadCjCatalog();
  startFirestoreListener();
}

document.addEventListener("DOMContentLoaded", async () => {
  await bootstrap();
  initMobileNav();
  whenIdle(() => initCart());
  initShopLive();
});

window.addEventListener("pagehide", () => {
  unsubscribeFirestore?.();
});
