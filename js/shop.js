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

function getParamsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get("category") || null,
    badge: params.get("badge") || null,
  };
}

function sortProducts(products, sortValue) {
  const list = [...products];
  switch (sortValue) {
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

function renderGrid(products, activeFilter, sortValue) {
  const grid = document.getElementById("shop-grid");
  const noResults = document.getElementById("shop-no-results");
  const countEl = document.getElementById("shop-count");
  if (!grid) return;

  let filtered = products;
  if (activeFilter && activeFilter !== "all") {
    filtered = products.filter((p) => productMatchesFilter(p, activeFilter));
  }

  filtered = sortProducts(filtered, sortValue);

  if (!filtered.length) {
    grid.innerHTML = "";
    noResults.hidden = false;
    if (countEl) countEl.textContent = t("shop.productCountPlural", { count: 0 });
    return;
  }

  noResults.hidden = true;
  grid.innerHTML = filtered
    .map((p) => buildProductCard(p, "shop-card"))
    .join("");
  attachProductCardPrefetch(grid);
  attachWishlistButtons(grid, filtered);
  if (countEl) {
    countEl.textContent =
      filtered.length === 1
        ? t("shop.productCount", { count: filtered.length })
        : t("shop.productCountPlural", { count: filtered.length });
  }
}

function syncActiveFilter(activeFilter) {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    const match =
      activeFilter === "all"
        ? btn.dataset.filter === "all"
        : btn.dataset.filter === activeFilter;
    btn.classList.toggle("is-active", match);
  });
}

function updateHeading(activeFilter) {
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
  el.textContent = t(labelMap[activeFilter] || "shop.title");
}

async function init() {
  const grid = document.getElementById("shop-grid");
  if (!grid) return;

  const { category, badge } = getParamsFromUrl();
  let activeFilter = category || badge || "all";
  let sortValue = "default";
  let allProducts = [];

  grid.innerHTML = `<p class="cj-loading">${t("shop.loading")}</p>`;

  try {
    const data = await fetchAllCJProducts();
    allProducts = data.products;
  } catch (err) {
    console.error(err);
    grid.innerHTML = productsLoadErrorHtml(err);
    return;
  }

  syncActiveFilter(activeFilter);
  updateHeading(activeFilter);
  renderGrid(allProducts, activeFilter, sortValue);

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      syncActiveFilter(activeFilter);
      updateHeading(activeFilter);
      renderGrid(allProducts, activeFilter, sortValue);
    });
  });

  document.getElementById("sort-select")?.addEventListener("change", (e) => {
    sortValue = e.target.value;
    renderGrid(allProducts, activeFilter, sortValue);
  });

  document.getElementById("shop-clear-btn")?.addEventListener("click", () => {
    activeFilter = "all";
    sortValue = "default";
    const sel = document.getElementById("sort-select");
    if (sel) sel.value = "default";
    syncActiveFilter(activeFilter);
    updateHeading(activeFilter);
    renderGrid(allProducts, activeFilter, sortValue);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await bootstrap();
  initMobileNav();
  whenIdle(() => initCart());
  init();
});
