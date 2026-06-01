import { getProductBySlug, wixImage, formatPrice } from "./products.js";

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
}

function itemCount(items) {
  return items.reduce((sum, line) => sum + line.qty, 0);
}

function lineTotal(product, qty) {
  return product.price * qty;
}

function cartSubtotal(items) {
  return items.reduce((sum, line) => {
    const product = getProductBySlug(line.slug);
    return product ? sum + lineTotal(product, line.qty) : sum;
  }, 0);
}

export function addToCart(slug, qty = 1) {
  const amount = Math.max(1, Math.min(99, parseInt(String(qty), 10) || 1));
  const items = readCart();
  const existing = items.find((line) => line.slug === slug);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + amount);
  } else {
    items.push({ slug, qty: amount });
  }
  writeCart(items);
  renderCart();
  return items;
}

function setLineQty(slug, qty) {
  let items = readCart();
  if (qty < 1) {
    items = items.filter((line) => line.slug !== slug);
  } else {
    const line = items.find((l) => l.slug === slug);
    if (line) line.qty = Math.min(99, qty);
  }
  writeCart(items);
  renderCart();
}

function removeLine(slug) {
  writeCart(readCart().filter((line) => line.slug !== slug));
  renderCart();
}

function cartTitle(count) {
  const label = count === 1 ? "item" : "items";
  return `Cart (${count} ${label})`;
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
        <h2 id="cart-drawer-title" class="cart-drawer-title">Cart (0 items)</h2>
        <button type="button" class="cart-drawer-close" aria-label="Close cart">&times;</button>
      </header>
      <div class="cart-drawer-scroll">
        <div id="cart-items" class="cart-items"></div>
        <p id="cart-empty" class="cart-empty" hidden>Your cart is empty.</p>
        <button type="button" class="cart-promo" id="cart-promo-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          Enter a promo code
        </button>
        <div class="cart-totals" id="cart-totals">
          <div class="cart-totals-row">
            <span>Estimated total</span>
            <strong id="cart-estimated-total">$0.00</strong>
          </div>
          <p class="cart-totals-note">Taxes and shipping are calculated at checkout.</p>
        </div>
      </div>
      <footer class="cart-drawer-footer">
        <button type="button" class="cart-btn-checkout" id="cart-checkout-btn">Checkout</button>
        <button type="button" class="cart-btn-view" id="cart-view-btn">View Cart</button>
        <p class="cart-secure">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Secure Checkout
        </p>
      </footer>
    </aside>
  `
  );
}

function trashIcon() {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
}

function renderCartItems(items) {
  const container = document.getElementById("cart-items");
  const emptyEl = document.getElementById("cart-empty");
  const totalsEl = document.getElementById("cart-totals");
  const promoBtn = document.getElementById("cart-promo-btn");
  const footer = document.querySelector(".cart-drawer-footer");
  if (!container) return;

  const count = itemCount(items);

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

  container.innerHTML = items
    .map((line) => {
      const product = getProductBySlug(line.slug);
      if (!product) return "";
      const total = formatPrice(lineTotal(product, line.qty));
      return `
        <article class="cart-line" data-slug="${product.slug}">
          <img
            class="cart-line-img"
            src="${wixImage(product.image, 160, 160)}"
            alt=""
            width="80"
            height="80"
          />
          <div class="cart-line-body">
            <div class="cart-line-top">
              <h3 class="cart-line-name">${product.name}</h3>
              <button type="button" class="cart-line-remove" aria-label="Remove ${product.name}">
                ${trashIcon()}
              </button>
            </div>
            <div class="cart-line-bottom">
              <div class="cart-line-qty">
                <button type="button" class="cart-qty-minus" aria-label="Decrease quantity">−</button>
                <span class="cart-qty-value">${line.qty}</span>
                <button type="button" class="cart-qty-plus" aria-label="Increase quantity">+</button>
              </div>
              <span class="cart-line-price">${total}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll(".cart-line").forEach((row) => {
    const slug = row.dataset.slug;
    row.querySelector(".cart-line-remove")?.addEventListener("click", () => removeLine(slug));
    row.querySelector(".cart-qty-minus")?.addEventListener("click", () => {
      const line = readCart().find((l) => l.slug === slug);
      if (line) setLineQty(slug, line.qty - 1);
    });
    row.querySelector(".cart-qty-plus")?.addEventListener("click", () => {
      const line = readCart().find((l) => l.slug === slug);
      if (line) setLineQty(slug, line.qty + 1);
    });
  });
}

export function renderCart() {
  const items = readCart().filter((line) => getProductBySlug(line.slug));
  if (items.length !== readCart().length) writeCart(items);

  const count = itemCount(items);
  const title = document.getElementById("cart-drawer-title");
  const totalEl = document.getElementById("cart-estimated-total");

  if (title) title.textContent = cartTitle(count);
  if (totalEl) totalEl.textContent = formatPrice(cartSubtotal(items));

  renderCartItems(items);
  updateCartButtons(count);
}

function updateCartButtons(count) {
  document.querySelectorAll(".cart-btn").forEach((btn) => {
    btn.setAttribute("aria-label", `Cart, ${count} items`);
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
