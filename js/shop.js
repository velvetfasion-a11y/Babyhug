import {
  buildProductCard,
  fetchCJProducts,
  priceNumber,
  productName,
} from "./cj-products.js";
import { initCart } from "./cart.js";
import { whenIdle } from "./perf.js";

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
    const q = activeFilter.toLowerCase();
    filtered = products.filter((p) => {
      const name = productName(p).toLowerCase();
      return name.includes(q);
    });
  }

  filtered = sortProducts(filtered, sortValue);

  if (!filtered.length) {
    grid.innerHTML = "";
    noResults.hidden = false;
    if (countEl) countEl.textContent = "0 products";
    return;
  }

  noResults.hidden = true;
  grid.innerHTML = filtered
    .map((p) => buildProductCard(p, "shop-card"))
    .join("");
  if (countEl) {
    countEl.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
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
    all: "Shop All",
    Boy: "Boy",
    Girl: "Girl",
    Toys: "Toys",
    Sale: "Sale",
    "New Arrival": "New In",
    "Best Seller": "Best Sellers",
  };
  el.textContent = labelMap[activeFilter] || "Shop All";
}

async function init() {
  const grid = document.getElementById("shop-grid");
  if (!grid) return;

  const { category, badge } = getParamsFromUrl();
  let activeFilter = category || badge || "all";
  let sortValue = "default";
  let allProducts = [];

  try {
    const data = await fetchCJProducts(24);
    allProducts = data.products;
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="cj-error">Could not load products. Run <code>npm run dev</code> in the terminal, then open <a href="http://localhost:3000/shop.html">http://localhost:3000/shop.html</a> (not a file:// link).</p>`;
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

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  whenIdle(() => initCart());
  init();
});
