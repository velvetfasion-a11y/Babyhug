import { bootstrap } from "./bootstrap.js";
import {
  fetchAllCJProducts,
  formatProductPrice,
  priceNumber,
  productName,
  productPageUrl,
  parseImageUrl,
  escapeHtml,
} from "./cj-products.js";
import {
  addToCartItem,
  getCartLines,
  removeFromCartLine,
  initCart,
  renderCart,
} from "./cart.js";
import { formatStoreAmount } from "./currency.js";
import { getWishlist, removeFromWishlist, wishlistId } from "./wishlist.js";
import { t } from "./i18n.js";

const PROFILE_KEY = "babyhug-profile";

const els = {
  avatar: document.getElementById("profile-avatar"),
  name: document.getElementById("profile-name"),
  email: document.getElementById("profile-email"),
  editBtn: document.getElementById("profile-edit-btn"),
  wishlist: document.getElementById("profile-wishlist"),
  recs: document.getElementById("profile-recs"),
  cartItems: document.getElementById("profile-cart-items"),
  cartFooter: document.getElementById("profile-cart-footer"),
  cartTotal: document.getElementById("profile-cart-total"),
  checkoutBtn: document.getElementById("profile-checkout-btn"),
  toast: document.getElementById("profile-toast"),
};

function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return {
      name: data?.name?.trim() || "Guest",
      email: data?.email?.trim() || "",
    };
  } catch {
    return { name: "Guest", email: "" };
  }
}

function writeProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 1800);
}

function cartHasLine(id) {
  return getCartLines().some((line) => line.id === id);
}

function formatItemOptions(item) {
  if (Array.isArray(item.options) && item.options.length) {
    return item.options.map((o) => `${o.name}: ${o.value}`).join(" · ");
  }
  if (item.selectedOptions && typeof item.selectedOptions === "object") {
    return Object.entries(item.selectedOptions)
      .map(([name, value]) => `${name}: ${value}`)
      .join(" · ");
  }
  return "";
}

function cjToLine(product) {
  const pid = product.pid ?? product.productId;
  const sku = product.productSku ?? product.sku;
  const id = pid ? `cj-${pid}` : sku ? `cj-${sku}` : null;
  const name = productName(product);
  const image = parseImageUrl(product);
  return {
    id,
    pid: pid ? String(pid) : undefined,
    sku: sku ? String(sku) : undefined,
    name,
    image,
    price: priceNumber(product),
    displayPrice: formatProductPrice(product),
    category:
      product.adminCategories?.[0] ?? product.adminCategory ?? "",
    href: productPageUrl(product),
  };
}

function addProductToCart(item) {
  if (!item.id) return;
  if (cartHasLine(item.id)) {
    showToast(t("profile.alreadyInCart"));
    return;
  }

  addToCartItem({
    id: item.id,
    pid: item.pid,
    vid: item.vid ?? item.variantId,
    variantId: item.variantId ?? item.vid,
    sku: item.sku ?? item.variantSku,
    variantSku: item.variantSku ?? item.sku,
    name: item.name,
    image: item.image,
    price: Number(item.price) || 0,
    selectedOptions: item.selectedOptions ?? {},
    options: item.options ?? [],
  });
  showToast(t("profile.addedToCart", { name: item.name }));
  renderProfileCart();
  renderWishlist();
  renderRecommendations(window.__profileCatalog ?? []);
}

function renderProfileHeader() {
  const profile = readProfile();
  if (els.avatar) els.avatar.textContent = initials(profile.name);
  if (els.name) els.name.textContent = profile.name;
  if (els.email) {
    els.email.textContent = profile.email || t("profile.noEmail");
  }
}

function renderWishlist() {
  if (!els.wishlist) return;
  const items = getWishlist();

  if (!items.length) {
    els.wishlist.innerHTML = `<p class="profile-empty">${escapeHtml(t("profile.wishlistEmpty"))}</p>`;
    return;
  }

  els.wishlist.innerHTML = items
    .map((item) => {
      const id = wishlistId(item);
      const inCart = cartHasLine(id);
      const href = item.href || (item.pid ? productPageUrl(item) : "shop.html");
      const price =
        typeof item.price === "number"
          ? formatStoreAmount(item.price)
          : item.displayPrice ?? String(item.price ?? "");

      return `
        <article class="profile-wish-item" data-wish-id="${escapeHtml(id)}">
          <a href="${escapeHtml(href)}" class="profile-wish-thumb">
            <img src="${escapeHtml(item.image || "")}" alt="" width="44" height="44" loading="lazy" />
          </a>
          <div class="profile-wish-info">
            <div class="profile-wish-name">
              <a href="${escapeHtml(href)}">${escapeHtml(item.name)}</a>
            </div>
            <div class="profile-wish-cat">${escapeHtml(formatItemOptions(item) || item.category || "")}</div>
          </div>
          <span class="profile-wish-price">${escapeHtml(price)}</span>
          <div class="profile-icon-actions">
            <button type="button" class="profile-icon-btn${inCart ? " is-added" : ""}" data-add-cart="${escapeHtml(id)}" aria-label="${escapeHtml(t("profile.addToCart"))}">
              ${inCart ? "✓" : "🛒"}
            </button>
            <button type="button" class="profile-icon-btn profile-icon-btn--remove" data-remove-wish="${escapeHtml(id)}" aria-label="${escapeHtml(t("profile.removeWish"))}">♥</button>
          </div>
        </article>`;
    })
    .join("");

  els.wishlist.querySelectorAll("[data-add-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = items.find((w) => wishlistId(w) === btn.dataset.addCart);
      if (item) addProductToCart(item);
    });
  });

  els.wishlist.querySelectorAll("[data-remove-wish]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromWishlist(btn.dataset.removeWish);
      showToast(t("profile.removedFromWishlist"));
      renderWishlist();
    });
  });
}

function pickRecommendations(products, wishlist, limit = 4) {
  const wishIds = new Set(wishlist.map((w) => wishlistId(w)));
  const pool = products.filter((p) => {
    const line = cjToLine(p);
    return line.id && !wishIds.has(line.id);
  });

  const wishCats = new Set(
    wishlist.map((w) => w.category).filter(Boolean)
  );

  let scored = pool;
  if (wishCats.size) {
    scored = [...pool].sort((a, b) => {
      const ac = a.adminCategories?.some((c) => wishCats.has(c)) ? 1 : 0;
      const bc = b.adminCategories?.some((c) => wishCats.has(c)) ? 1 : 0;
      return bc - ac;
    });
  }

  return scored.slice(0, limit).map(cjToLine);
}

function renderRecommendations(products) {
  if (!els.recs) return;
  const recs = pickRecommendations(products, getWishlist(), 4);

  if (!recs.length) {
    els.recs.innerHTML = `<p class="profile-empty">${escapeHtml(t("profile.recsEmpty"))}</p>`;
    return;
  }

  els.recs.innerHTML = recs
    .map((item) => {
      const inCart = cartHasLine(item.id);
      return `
        <article class="profile-rec-card">
          <a href="${escapeHtml(item.href)}" class="profile-rec-img">
            <img src="${escapeHtml(item.image)}" alt="" width="200" height="130" loading="lazy" />
          </a>
          <div class="profile-rec-body">
            <div class="profile-rec-name">${escapeHtml(item.name)}</div>
            <div class="profile-rec-cat">${escapeHtml(item.category)}</div>
            <div class="profile-rec-footer">
              <span class="profile-rec-price">${escapeHtml(item.displayPrice)}</span>
              <button type="button" class="profile-icon-btn${inCart ? " is-added" : ""}" data-rec-cart="${escapeHtml(item.id)}" aria-label="${escapeHtml(t("profile.addToCart"))}">
                ${inCart ? "✓" : "🛒"}
              </button>
            </div>
          </div>
        </article>`;
    })
    .join("");

  els.recs.querySelectorAll("[data-rec-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = recs.find((r) => r.id === btn.dataset.recCart);
      if (item) addProductToCart(item);
    });
  });
}

function renderProfileCart() {
  if (!els.cartItems || !els.cartFooter || !els.cartTotal) return;

  const lines = getCartLines();

  if (!lines.length) {
    els.cartItems.innerHTML = `<p class="profile-empty">${escapeHtml(t("profile.cartEmpty"))}</p>`;
    els.cartFooter.hidden = true;
    return;
  }

  let total = 0;
  els.cartItems.innerHTML = lines
    .map((line) => {
      total += line.price * line.qty;
      return `
        <article class="profile-cart-item" data-line-id="${escapeHtml(line.id)}">
          <div class="profile-cart-thumb">
            <img src="${escapeHtml(line.image)}" alt="" width="44" height="44" loading="lazy" />
          </div>
          <div class="profile-cart-info">
            <div class="profile-cart-name">${escapeHtml(line.name)}</div>
            <div class="profile-cart-sub">${escapeHtml([formatItemOptions(line), t("profile.qty", { n: line.qty })].filter(Boolean).join(" · "))}</div>
          </div>
          <span class="profile-cart-price">${escapeHtml(formatStoreAmount(line.price * line.qty))}</span>
          <button type="button" class="profile-remove-btn" data-remove-line="${escapeHtml(line.id)}" aria-label="${escapeHtml(t("cart.remove", { name: line.name }))}">✕</button>
        </article>`;
    })
    .join("");

  els.cartTotal.textContent = formatStoreAmount(total);
  els.cartFooter.hidden = false;

  els.cartItems.querySelectorAll("[data-remove-line]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCartLine(btn.dataset.removeLine);
      renderCart();
      renderProfileCart();
      renderWishlist();
      renderRecommendations(window.__profileCatalog ?? []);
    });
  });
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

function bindProfileEdit() {
  els.editBtn?.addEventListener("click", () => {
    const profile = readProfile();
    const name = prompt(t("profile.promptName"), profile.name);
    if (name == null) return;
    const email = prompt(t("profile.promptEmail"), profile.email);
    if (email == null) return;
    writeProfile({ name: name.trim() || "Guest", email: email.trim() });
    renderProfileHeader();
  });

  els.checkoutBtn?.addEventListener("click", () => {
    alert(t("profile.checkoutSoon"));
  });
}

async function loadCatalog() {
  try {
    const { products } = await fetchAllCJProducts();
    window.__profileCatalog = products;
    renderRecommendations(products);
  } catch (err) {
    console.error("Profile recommendations:", err);
    if (els.recs) {
      els.recs.innerHTML = `<p class="profile-empty">${escapeHtml(t("profile.recsError"))}</p>`;
    }
  }
}

async function initProfilePage() {
  await bootstrap();
  initMobileNav();
  initCart();
  renderProfileHeader();
  renderWishlist();
  renderProfileCart();
  bindProfileEdit();
  await loadCatalog();

  window.addEventListener("storage", (e) => {
    if (e.key === "babyhug-cart" || e.key === "babyhug-wishlist") {
      renderWishlist();
      renderProfileCart();
      renderRecommendations(window.__profileCatalog ?? []);
      renderCart();
    }
  });
}

initProfilePage();
