import {
  canUseAuth,
  createAccountWithEmail,
  getCurrentUser,
  mapAuthError,
  onAuthChange,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
} from "./auth.js";
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

let emailAuthMode = "signin";
let loginFailedOnce = false;

const els = {
  account: document.getElementById("profile-account"),
  authBanner: document.getElementById("profile-auth-banner"),
  authTitle: document.getElementById("profile-auth-title"),
  authHint: document.getElementById("profile-auth-hint"),
  authError: document.getElementById("profile-auth-error"),
  emailForm: document.getElementById("profile-email-form"),
  nameField: document.getElementById("profile-name-field"),
  nameInput: document.getElementById("profile-name-input"),
  emailInput: document.getElementById("profile-email-input"),
  passwordInput: document.getElementById("profile-password-input"),
  emailSubmit: document.getElementById("profile-email-submit"),
  toggleMode: document.getElementById("profile-toggle-mode"),
  linksSep: document.getElementById("profile-links-sep"),
  forgotPassword: document.getElementById("profile-forgot-password"),
  googleBtn: document.getElementById("profile-google-btn"),
  googleLabel: document.getElementById("profile-google-label"),
  signOutBtn: document.getElementById("profile-signout-btn"),
  signedInAs: document.getElementById("profile-signed-in-as"),
  avatar: document.getElementById("profile-avatar"),
  name: document.getElementById("profile-name"),
  email: document.getElementById("profile-email"),
  wishlist: document.getElementById("profile-wishlist"),
  recs: document.getElementById("profile-recs"),
  cartItems: document.getElementById("profile-cart-items"),
  cartFooter: document.getElementById("profile-cart-footer"),
  cartTotal: document.getElementById("profile-cart-total"),
  checkoutBtn: document.getElementById("profile-checkout-btn"),
  toast: document.getElementById("profile-toast"),
};

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
    sku: item.sku,
    name: item.name,
    image: item.image,
    price: Number(item.price) || 0,
  });
  showToast(t("profile.addedToCart", { name: item.name }));
  renderProfileCart();
  renderWishlist();
  renderRecommendations(window.__profileCatalog ?? []);
}

function displayName(user) {
  if (user?.displayName?.trim()) return user.displayName.trim();
  if (user?.email) return user.email.split("@")[0];
  return t("profile.account");
}

function signedInLabel(user) {
  const provider = user?.providerData?.[0]?.providerId;
  if (provider === "google.com") return t("profile.signedInWithGoogle");
  if (provider === "password") return t("profile.signedInWithEmail");
  return t("profile.signedInGeneric");
}

function showAuthError(message) {
  if (!els.authError) return;
  els.authError.textContent = message;
  els.authError.hidden = !message;
}

function clearAuthError() {
  showAuthError("");
}

function looksLikeEmail(value) {
  const v = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function updateForgotPasswordVisibility() {
  const show =
    emailAuthMode === "signin" && loginFailedOnce && Boolean(els.forgotPassword);
  if (els.forgotPassword) els.forgotPassword.hidden = !show;
  if (els.linksSep) els.linksSep.hidden = !show;
}

function setEmailAuthMode(mode) {
  emailAuthMode = mode === "signup" ? "signup" : "signin";
  const isSignUp = emailAuthMode === "signup";

  if (mode === "signup") {
    loginFailedOnce = false;
  }

  els.authBanner?.classList.toggle("is-signup", isSignUp);

  if (els.authTitle) {
    els.authTitle.textContent = isSignUp
      ? t("profile.createAccountTitle")
      : t("profile.signInTitle");
  }
  if (els.emailSubmit) {
    els.emailSubmit.textContent = isSignUp
      ? t("profile.createAccount")
      : t("profile.signInEmail");
  }
  if (els.toggleMode) {
    els.toggleMode.textContent = isSignUp
      ? t("profile.haveAccount")
      : t("profile.createAccountLink");
  }
  if (els.passwordInput) {
    els.passwordInput.autocomplete = isSignUp ? "new-password" : "current-password";
  }
  updateForgotPasswordVisibility();
  clearAuthError();
}

function updateProfileVisibility() {
  const user = getCurrentUser();
  const signedIn = Boolean(user);

  if (els.account) els.account.hidden = !signedIn;
  if (els.authBanner) els.authBanner.hidden = signedIn;
  document.body.classList.toggle("profile-is-signed-in", signedIn);
  document.body.classList.toggle("profile-is-signed-out", !signedIn);
}

function renderProfileHeader() {
  const user = getCurrentUser();
  if (!user) return;

  const name = displayName(user);
  const email = user.email ?? "";

  if (els.avatar) {
    if (user.photoURL) {
      els.avatar.innerHTML = `<img src="${escapeHtml(user.photoURL)}" alt="" width="48" height="48" />`;
      els.avatar.classList.add("has-photo");
    } else {
      els.avatar.classList.remove("has-photo");
      els.avatar.textContent = initials(name);
    }
  }
  if (els.name) els.name.textContent = name;
  if (els.email) els.email.textContent = email;
  if (els.signedInAs) {
    els.signedInAs.textContent = signedInLabel(user);
  }
  if (els.signOutBtn) {
    els.signOutBtn.textContent = t("profile.signOut");
  }
}

function renderAuthUi() {
  setEmailAuthMode(emailAuthMode);

  if (els.authHint) {
    els.authHint.textContent = canUseAuth()
      ? t("profile.authHint")
      : t("profile.authNotConfigured");
  }
  if (els.emailForm) {
    els.emailForm.querySelectorAll("input, button").forEach((el) => {
      el.disabled = !canUseAuth();
    });
  }
  if (els.googleBtn) {
    els.googleBtn.disabled = !canUseAuth();
    els.googleBtn.hidden = !canUseAuth();
  }
  if (els.googleLabel) {
    els.googleLabel.textContent = t("profile.signInGoogle");
  }
  if (els.forgotPassword) {
    els.forgotPassword.textContent = t("profile.forgotPassword");
  }
  updateForgotPasswordVisibility();
  updateProfileVisibility();
}

function refreshSignedInContent() {
  updateProfileVisibility();
  const user = getCurrentUser();
  if (!user) return;

  renderProfileHeader();
  renderWishlist();
  renderProfileCart();

  if (window.__profileCatalog?.length) {
    renderRecommendations(window.__profileCatalog);
  } else {
    loadCatalog();
  }
}

function bindAuth() {
  els.toggleMode?.addEventListener("click", () => {
    loginFailedOnce = false;
    setEmailAuthMode(emailAuthMode === "signup" ? "signin" : "signup");
  });

  els.forgotPassword?.addEventListener("click", async () => {
    clearAuthError();
    const email = els.emailInput?.value?.trim();
    if (!email) {
      showAuthError(t("profile.enterEmailFirst"));
      els.emailInput?.focus();
      return;
    }
    try {
      await sendPasswordReset(email);
      showToast(t("profile.resetEmailSent"));
    } catch (err) {
      console.error(err);
      showAuthError(mapAuthError(err));
    }
  });

  els.emailForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!canUseAuth()) return;

    clearAuthError();
    const login = els.emailInput?.value?.trim();
    const password = els.passwordInput?.value ?? "";
    const name = els.nameInput?.value?.trim() ?? "";

    if (!login || !password) {
      showAuthError(t("profile.fillEmailPassword"));
      return;
    }

    if (els.emailSubmit) els.emailSubmit.disabled = true;

    try {
      if (emailAuthMode === "signup") {
        if (!looksLikeEmail(login)) {
          showAuthError(t("profile.errorInvalidEmail"));
          return;
        }
        await createAccountWithEmail(login, password, name);
        showToast(t("profile.accountCreated"));
      } else {
        if (looksLikeEmail(login)) {
          await signInWithEmail(login, password);
          showToast(t("profile.signedIn"));
        } else {
          const adminRes = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: login, password }),
          });
          const adminData = await adminRes.json().catch(() => ({}));
          if (!adminRes.ok || !adminData?.token) {
            const adminErr = new Error(
              adminData?.error || t("profile.errorWrongCredentials")
            );
            adminErr.code = "admin-login-failed";
            throw adminErr;
          }
          sessionStorage.setItem("bh_admin_token", adminData.token);
          window.location.href = "admin.html";
          return;
        }
      }
      els.emailForm?.reset();
      refreshSignedInContent();
      renderCart();
    } catch (err) {
      console.error(err);
      if (err?.code === "admin-login-failed") {
        loginFailedOnce = true;
        updateForgotPasswordVisibility();
        showAuthError(t("profile.errorWrongCredentials"));
        return;
      }
      if (emailAuthMode === "signin") {
        loginFailedOnce = true;
        updateForgotPasswordVisibility();
      }
      showAuthError(mapAuthError(err));
    } finally {
      if (els.emailSubmit) els.emailSubmit.disabled = !canUseAuth();
    }
  });

  els.googleBtn?.addEventListener("click", async () => {
    if (!canUseAuth()) return;
    clearAuthError();
    els.googleBtn.disabled = true;
    try {
      await signInWithGoogle();
      showToast(t("profile.signedIn"));
      refreshSignedInContent();
      renderCart();
    } catch (err) {
      console.error(err);
      showAuthError(mapAuthError(err));
    } finally {
      els.googleBtn.disabled = false;
    }
  });

  els.signOutBtn?.addEventListener("click", async () => {
    try {
      await signOutUser();
      showToast(t("profile.signedOut"));
      updateProfileVisibility();
    } catch (err) {
      console.error(err);
    }
  });

  onAuthChange((user) => {
    if (user) {
      refreshSignedInContent();
      renderCart();
    } else {
      updateProfileVisibility();
    }
  });
}

function renderWishlist() {
  if (!els.wishlist || !getCurrentUser()) return;
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
            <div class="profile-wish-cat">${escapeHtml(item.category || "")}</div>
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
  if (!els.recs || !getCurrentUser()) return;
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
  if (!els.cartItems || !els.cartFooter || !els.cartTotal || !getCurrentUser()) {
    return;
  }

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
            <div class="profile-cart-sub">${escapeHtml(t("profile.qty", { n: line.qty }))}</div>
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

function bindCheckout() {
  els.checkoutBtn?.addEventListener("click", () => {
    alert(t("profile.checkoutSoon"));
  });
}

async function loadCatalog() {
  if (!getCurrentUser()) return;
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

function bindStorageSync() {
  window.addEventListener("storage", (e) => {
    if (!getCurrentUser()) return;
    if (e.key === "babyhug-cart" || e.key === "babyhug-wishlist") {
      renderWishlist();
      renderProfileCart();
      renderRecommendations(window.__profileCatalog ?? []);
      renderCart();
    }
  });

  window.addEventListener("babyhug-wishlist-updated", () => {
    if (!getCurrentUser()) return;
    renderWishlist();
    renderRecommendations(window.__profileCatalog ?? []);
  });

  window.addEventListener("babyhug-cart-updated", () => {
    if (!getCurrentUser()) return;
    renderProfileCart();
    renderCart();
    renderWishlist();
    renderRecommendations(window.__profileCatalog ?? []);
  });
}

async function initProfilePage() {
  await bootstrap();
  initMobileNav();
  initCart();
  renderAuthUi();
  bindAuth();
  bindCheckout();
  bindStorageSync();

  if (getCurrentUser()) {
    refreshSignedInContent();
  }
}

initProfilePage().catch((err) => {
  console.error("Profile page failed to start:", err);
  import("./i18n.js")
    .then(({ initI18n }) => initI18n())
    .finally(() => renderAuthUi());
});
