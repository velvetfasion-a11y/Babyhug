import { getCurrentUser } from "./auth.js";
import { getProductBySlug, wixImage } from "./products.js";
import { parseImageUrl, productName } from "./cj-products.js";
import { formatStoreAmount } from "./currency.js";
import { t } from "./i18n.js";
import { cartLineId, saveCartToCloud } from "./user-store.js";

const STORAGE_KEY = "babyhug-cart";

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("babyhug-cart-updated"));

  const user = getCurrentUser();
  if (user?.uid) {
    saveCartToCloud(user.uid, items).catch((err) => {
      console.warn("Cart cloud sync failed:", err);
    });
  }
}

function lineId(line) {
  return cartLineId(line);
}

function itemCount(items) {
  return items.reduce((sum, line) => sum + line.qty, 0);
}

/** Resolve display fields (supports legacy slug-only lines + CJ snapshots). */
function resolveLine(line) {
  if (line.name && line.image && line.price != null) {
    return {
      id: lineId(line),
      name: line.name,
      image: line.image,
      price: Number(line.price),
      qty: line.qty,
      slug: line.slug,
      pid: line.pid,
      sku: line.sku,
      vid: line.vid,
      variantSku: line.variantSku,
    };
  }

  if (line.slug) {
    const p = getProductBySlug(line.slug);
    if (!p) return null;
    return {
      id: line.slug,
      slug: line.slug,
      name: p.name,
      image: wixImage(p.image, 160, 160),
      price: p.price,
      qty: line.qty,
    };
  }

  return null;
}

function cartSubtotal(items) {
  return items.reduce((sum, line) => {
    const resolved = resolveLine(line);
    return resolved ? sum + resolved.price * resolved.qty : sum;
  }, 0);
}

/**
 * Add any product to cart (local slug catalog or CJ product with pid/sku).
 */
export function addToCartItem(item, qty = 1) {
  const amount = Math.max(1, Math.min(99, parseInt(String(qty), 10) || 1));
  const id =
    item.id ??
    (item.vid ? `cj-vid-${item.vid}` : null) ??
    item.slug ??
    (item.pid ? `cj-${item.pid}` : `cj-${item.sku}`);

  const line = {
    id,
    qty: amount,
    name: item.name,
    image: item.image,
    price: Number(item.price),
    slug: item.slug,
    pid: item.pid,
    sku: item.sku,
    vid: item.vid,
    variantSku: item.variantSku,
  };

  const items = readCart();
  const existing = items.find((l) => lineId(l) === id);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + amount);
    if (!existing.name) Object.assign(existing, line);
  } else {
    items.push(line);
  }
  writeCart(items);
  renderCart();
  return items;
}

/** Add a product from the local Wix catalog (products.js). */
export function addToCart(slug, qty = 1) {
  const product = getProductBySlug(slug);
  if (!product) return readCart();

  return addToCartItem(
    {
      id: slug,
      slug,
      name: product.name,
      image: wixImage(product.image, 160, 160),
      price: product.price,
    },
    qty
  );
}

function setLineQty(id, qty) {
  let items = readCart();
  if (qty < 1) {
    items = items.filter((line) => lineId(line) !== id);
  } else {
    const line = items.find((l) => lineId(l) === id);
    if (line) line.qty = Math.min(99, qty);
  }
  writeCart(items);
  renderCart();
}

function removeLine(id) {
  writeCart(readCart().filter((line) => lineId(line) !== id));
  renderCart();
}

function cartTitle(count) {
  const label = count === 1 ? t("cart.item") : t("cart.items");
  return t("cart.title", { count, label });
}

function injectCartMarkup() {
  if (document.getElementById("cart-drawer")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="cart-backdrop" class="cart-backdrop" hidden></div>
    <aside
      id="cart-drawer"
      class="cart-drawer"
      aria-hidden="true"
      aria-modal="true"
      role="dialog"
      aria-labelledby="cart-drawer-title"
    >
      <header class="cart-drawer-header">
        <h2 id="cart-drawer-title" class="cart-drawer-title">${cartTitle(0)}</h2>
        <button type="button" class="cart-drawer-close" aria-label="${t("cart.close")}">&times;</button>
      </header>
      <div class="cart-drawer-scroll">
        <div id="cart-items" class="cart-items"></div>
        <p id="cart-empty" class="cart-empty" hidden>${t("cart.empty")}</p>
        <button type="button" class="cart-promo" id="cart-promo-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          ${t("cart.promo")}
        </button>
        <div class="cart-totals" id="cart-totals">
          <div class="cart-totals-row">
            <span>${t("cart.estimatedTotal")}</span>
            <strong id="cart-estimated-total">${formatStoreAmount(0)}</strong>
          </div>
          <p class="cart-totals-note">${t("cart.taxesNote")}</p>
        </div>
      </div>
      <footer class="cart-drawer-footer">
        <button type="button" class="cart-btn-checkout" id="cart-checkout-btn">${t("cart.checkout")}</button>
        <button type="button" class="cart-btn-view" id="cart-view-btn">${t("cart.viewCart")}</button>
        <p class="cart-secure">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          ${t("cart.secure")}
        </p>
      </footer>
    </aside>
  `
  );
}

function trashIcon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCartItems(items) {
  const container = document.getElementById("cart-items");
  const emptyEl = document.getElementById("cart-empty");
  const totalsEl = document.getElementById("cart-totals");
  const promoBtn = document.getElementById("cart-promo-btn");
  const footer = document.querySelector(".cart-drawer-footer");
  if (!container) return;

  const resolved = items.map(resolveLine).filter(Boolean);
  const count = itemCount(resolved);

  if (!count) {
    container.innerHTML = "";
    emptyEl.hidden = false;
    totalsEl.hidden = true;
    promoBtn.hidden = true;
    footer.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  totalsEl.hidden = false;
  promoBtn.hidden = false;
  footer.hidden = false;

  container.innerHTML = resolved
    .map((line) => {
      const total = formatStoreAmount(line.price * line.qty);
      const name = escapeHtml(line.name);
      return `
        <article class="cart-line" data-line-id="${escapeHtml(line.id)}">
          <img
            class="cart-line-img"
            src="${escapeHtml(line.image)}"
            alt=""
            width="80"
            height="80"
          />
          <div class="cart-line-body">
            <div class="cart-line-top">
              <h3 class="cart-line-name">${name}</h3>
              <button type="button" class="cart-line-remove" aria-label="${t("cart.remove", { name })}">
                ${trashIcon()}
              </button>
            </div>
            <div class="cart-line-bottom">
              <div class="cart-line-qty">
                <button type="button" class="cart-qty-minus" aria-label="${t("product.decreaseQty")}">−</button>
                <span class="cart-qty-value">${line.qty}</span>
                <button type="button" class="cart-qty-plus" aria-label="${t("product.increaseQty")}">+</button>
              </div>
              <span class="cart-line-price">${total}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll(".cart-line").forEach((row) => {
    const id = row.dataset.lineId;
    row.querySelector(".cart-line-remove")?.addEventListener("click", () => removeLine(id));
    row.querySelector(".cart-qty-minus")?.addEventListener("click", () => {
      const line = readCart().find((l) => lineId(l) === id);
      if (line) setLineQty(id, line.qty - 1);
    });
    row.querySelector(".cart-qty-plus")?.addEventListener("click", () => {
      const line = readCart().find((l) => lineId(l) === id);
      if (line) setLineQty(id, line.qty + 1);
    });
  });
}

export function getCartLines() {
  return readCart().map(resolveLine).filter(Boolean);
}

export function removeFromCartLine(id) {
  removeLine(id);
}

export function getCartItemCount() {
  return itemCount(getCartLines());
}

export function renderCart() {
  const raw = readCart();
  const valid = raw.filter((line) => resolveLine(line));
  if (valid.length !== raw.length) writeCart(valid);

  const count = itemCount(valid);
  const title = document.getElementById("cart-drawer-title");
  const totalEl = document.getElementById("cart-estimated-total");

  if (title) title.textContent = cartTitle(count);
  if (totalEl) totalEl.textContent = formatStoreAmount(cartSubtotal(valid));

  renderCartItems(valid);
  updateCartButtons(count);
}

function updateCartButtons(count) {
  document.querySelectorAll(".cart-btn").forEach((btn) => {
    btn.setAttribute("aria-label", t("nav.cart", { count }));
    let badge = btn.querySelector(".cart-count");
    if (count > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "cart-count";
        btn.appendChild(badge);
      }
      badge.textContent = String(count);
      badge.hidden = false;
    } else if (badge) {
      badge.hidden = true;
    }
  });
}

export function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-backdrop");
  if (!drawer || !backdrop) return;

  renderCart();
  drawer.classList.add("is-open");
  backdrop.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  drawer.querySelector(".cart-drawer-close")?.focus();
}

export function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-backdrop");
  if (!drawer || !backdrop) return;

  drawer.classList.remove("is-open");
  backdrop.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

export function initCart() {
  injectCartMarkup();
  renderCart();

  document.querySelectorAll(".cart-btn").forEach((btn) => {
    btn.addEventListener("click", openCartDrawer);
  });

  document.getElementById("cart-backdrop")?.addEventListener("click", closeCartDrawer);
  document.querySelector(".cart-drawer-close")?.addEventListener("click", closeCartDrawer);

  document.getElementById("cart-checkout-btn")?.addEventListener("click", () => {
    alert("Checkout is coming soon — thank you for shopping with Baby Hug.");
  });

  document.getElementById("cart-view-btn")?.addEventListener("click", () => {
    closeCartDrawer();
  });

  document.getElementById("cart-promo-btn")?.addEventListener("click", () => {
    const code = prompt("Enter promo code:");
    if (code) alert(`Promo code "${code}" will be applied at checkout.`);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.getElementById("cart-drawer")?.classList.contains("is-open")) {
      closeCartDrawer();
    }
  });
}
