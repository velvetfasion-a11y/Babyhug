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
import { signOut } from "firebase/auth";
import { auth } from "./firebase-config.js";
import { loadUserProfile, updateUserProfileFields } from "./auth-profile.js";
import { whenAuthReady } from "./user-firestore.js";

const els = {
  avatar: document.getElementById("profile-avatar"),
  name: document.getElementById("profile-name"),
  email: document.getElementById("profile-email"),
  editBtn: document.getElementById("profile-edit-btn"),
  signOutBtn: document.getElementById("profile-signout-btn"),
  wishlist: document.getElementById("profile-wishlist"),
  recs: document.getElementById("profile-recs"),
  cartItems: document.getElementById("profile-cart-items"),
  cartFooter: document.getElementById("profile-cart-footer"),
  cartTotal: document.getElementById("profile-cart-total"),
  checkoutBtn: document.getElementById("profile-checkout-btn"),
  toast: document.getElementById("profile-toast"),
};

/** @type {import('firebase/auth').User | null} */
let firebaseUser = null;
/** @type {Record<string, unknown> | null} */
let firestoreProfile = null;

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function displayName() {
  const fromProfile = String(firestoreProfile?.displayName ?? "").trim();
  if (fromProfile) return fromProfile;
  const fromAuth = String(firebaseUser?.displayName ?? "").trim();
  if (fromAuth) return fromAuth;
  const email = String(firebaseUser?.email ?? firestoreProfile?.email ?? "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return "Account";
}

function displayEmail() {
  return (
    String(firestoreProfile?.email ?? "").trim() ||
    String(firebaseUser?.email ?? "").trim()
  );
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
  const name = displayName();
  const email = displayEmail();
  if (els.avatar) els.avatar.textContent = initials(name);
  if (els.name) els.name.textContent = name;
  if (els.email) {
    els.email.textContent = email || t("profile.noEmail");
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

  return scored.slice(0, limit);
}

function renderRecommendations(products) {
  if (!els.recs) return;
  const wishlist = getWishlist();
  const picks = pickRecommendations(products, wishlist);

  if (!picks.length) {
    els.recs.innerHTML = `<p class="profile-empty">${escapeHtml(t("profile.recsEmpty"))}</p>`;
    return;
  }

  els.recs.innerHTML = picks
    .map((p) => {
      const line = cjToLine(p);
      const href = line.href || "shop.html";
      return `
        <a href="${escapeHtml(href)}" class="profile-rec-card">
          <img src="${escapeHtml(line.image || "")}" alt="" width="120" height="120" loading="lazy" />
          <span class="profile-rec-name">${escapeHtml(line.name)}</span>
          <span class="profile-rec-price">${escapeHtml(line.displayPrice)}</span>
        </a>`;
    })
    .join("");
}

function renderProfileCart() {
  if (!els.cartItems) return;
  const lines = getCartLines();

  if (!lines.length) {
    els.cartItems.innerHTML = `<p class="profile-empty">${escapeHtml(t("profile.cartEmpty"))}</p>`;
    if (els.cartFooter) els.cartFooter.hidden = true;
    return;
  }

  let total = 0;
  els.cartItems.innerHTML = lines
    .map((line) => {
      const qty = Number(line.qty) || 1;
      const lineTotal = (Number(line.price) || 0) * qty;
      total += lineTotal;
      const opts = formatItemOptions(line);
      return `
        <article class="profile-cart-line" data-line-id="${escapeHtml(line.id)}">
          <a href="${escapeHtml(line.href || "shop.html")}" class="profile-cart-thumb">
            <img src="${escapeHtml(line.image || "")}" alt="" width="48" height="48" loading="lazy" />
          </a>
          <div class="profile-cart-info">
            <div class="profile-cart-name">${escapeHtml(line.name)}</div>
            ${opts ? `<div class="profile-cart-opts">${escapeHtml(opts)}</div>` : ""}
            <div class="profile-cart-meta">${escapeHtml(t("profile.qty", { n: qty }))}</div>
          </div>
          <span class="profile-cart-price">${escapeHtml(formatStoreAmount(lineTotal))}</span>
          <button type="button" class="profile-cart-remove" data-remove-line="${escapeHtml(line.id)}" aria-label="Remove">×</button>
        </article>`;
    })
    .join("");

  if (els.cartTotal) els.cartTotal.textContent = formatStoreAmount(total);
  if (els.cartFooter) els.cartFooter.hidden = false;

  els.cartItems.querySelectorAll("[data-remove-line]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCartLine(btn.dataset.removeLine);
      renderProfileCart();
      renderCart();
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
  els.editBtn?.addEventListener("click", async () => {
    if (!firebaseUser) return;

    const name = prompt(t("profile.promptName"), displayName());
    if (name == null) return;
    const email = prompt(t("profile.promptEmail"), displayEmail());
    if (email == null) return;

    try {
      await updateUserProfileFields(firebaseUser.uid, {
        displayName: name.trim(),
        email: email.trim(),
      });
      firestoreProfile = {
        ...firestoreProfile,
        displayName: name.trim(),
        email: email.trim(),
      };
      renderProfileHeader();
    } catch (err) {
      console.error(err);
      showToast("Could not save profile. Please try again.");
    }
  });

  els.signOutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error(err);
      showToast("Sign out failed.");
    }
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

  const user = await whenAuthReady();
  if (!user) {
    window.location.replace("login.html?next=profile.html");
    return;
  }

  firebaseUser = user;

  try {
    firestoreProfile = await loadUserProfile(user);
  } catch (err) {
    console.error(err);
    if (els.name) {
      els.name.textContent = "Profile unavailable";
    }
    return;
  }

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
