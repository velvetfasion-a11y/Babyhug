import {
  getProductBySlug,
  wixImage,
  formatPrice,
} from "./products.js";
import {
  formatDisplayPrice,
  parseImageUrl,
  productName,
  parseCjPrice,
  PRICE_ADD_ON,
} from "./cj-products.js";
import { apiUrl } from "./config.js";
import { initCart, addToCart, addToCartItem, openCartDrawer } from "./cart.js";

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

function initQuantity() {
  const input = document.getElementById("product-qty");
  const minus = document.querySelector(".qty-minus");
  const plus = document.querySelector(".qty-plus");
  if (!input || !minus || !plus) return;

  minus.addEventListener("click", () => {
    const val = Math.max(1, parseInt(input.value, 10) - 1);
    input.value = String(val);
  });

  plus.addEventListener("click", () => {
    const val = Math.min(99, parseInt(input.value, 10) + 1);
    input.value = String(val);
  });
}

function initAccordions() {
  document.querySelectorAll(".product-accordion").forEach((accordion) => {
    const trigger = accordion.querySelector(".product-accordion-trigger");
    const panel = accordion.querySelector(".product-accordion-panel");
    if (!trigger || !panel) return;

    const setOpen = (open) => {
      accordion.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    };

    setOpen(accordion.classList.contains("is-open"));

    trigger.addEventListener("click", () => {
      setOpen(!accordion.classList.contains("is-open"));
    });
  });
}

function initGallery(product) {
  const mainImg = document.getElementById("product-main-img");
  const thumbs = document.querySelectorAll(".product-thumb");
  if (!mainImg || !thumbs.length) return;

  const images = product.image
    ? [product.image, product.image, product.image]
    : parseCjImages(product);
  const name = product.name ?? productName(product);

  thumbs.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      thumbs.forEach((t) => t.classList.remove("is-active"));
      btn.classList.add("is-active");
      const src = images[i] ?? images[0];
      if (!src) return;
      mainImg.src = product.image ? wixImage(product.image, 900, 1100) : src;
      mainImg.alt = `${name} — view ${i + 1}`;
    });
  });
}

function productToCartItem(product) {
  if (product.slug && getProductBySlug(product.slug)) {
    const p = getProductBySlug(product.slug);
    return {
      id: product.slug,
      slug: product.slug,
      name: p.name,
      image: wixImage(p.image, 160, 160),
      price: p.price,
    };
  }

  const pid = product.pid ?? product.productId;
  const sku = product.productSku ?? product.sku ?? "";
  const id = pid ? `cj-${pid}` : sku ? `cj-${sku}` : `cj-${Date.now()}`;
  const base = parseCjPrice(product.sellPrice) ?? product.price ?? 0;
  const price =
    product.price != null && !product.sellPrice
      ? Number(product.price)
      : base + PRICE_ADD_ON;

  return {
    id,
    pid: pid ? String(pid) : undefined,
    sku: sku || undefined,
    name: product.name ?? productName(product),
    image: product.image ? wixImage(product.image, 160, 160) : parseImageUrl(product),
    price,
  };
}

function initAddToCart(product) {
  const btn = document.getElementById("add-to-cart");
  if (!btn) return;

  const handler = () => {
    const qty = document.getElementById("product-qty")?.value || "1";
    const item = productToCartItem(product);
    if (item.slug && getProductBySlug(item.slug)) {
      addToCart(item.slug, qty);
    } else {
      addToCartItem(item, qty);
    }
    openCartDrawer();
  };

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("add-to-cart")?.addEventListener("click", handler);
}

function parseCjImages(product) {
  let images = [];
  const raw = product.productImageSet ?? product.productImage;
  if (Array.isArray(raw)) images = raw;
  else if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      images = JSON.parse(raw);
    } catch {
      images = [raw];
    }
  } else if (product.bigImage) images = [product.bigImage];
  else if (raw) images = [raw];
  return images.filter(Boolean);
}

function renderProduct(product) {
  const name = product.name ?? productName(product);
  const sku = product.sku ?? product.productSku ?? "";
  const images = product.image ? [product.image] : parseCjImages(product);
  const mainImage = images[0] ?? "";

  document.title = `${name} | Baby Hug`;
  document.getElementById("product-sku").textContent = `SKU: ${sku}`;
  document.getElementById("product-title").textContent = name;

  const priceEl = document.getElementById("product-price");
  priceEl.classList.remove("product-detail-price--sale");
  if (product.originalPrice) {
    priceEl.innerHTML = `<s>${formatPrice(product.originalPrice)}</s> <span>${formatPrice(product.price)}</span>`;
    priceEl.classList.add("product-detail-price--sale");
  } else if (product.price != null) {
    priceEl.textContent = formatPrice(product.price);
  } else {
    priceEl.textContent = formatDisplayPrice(product.sellPrice) || "$0.00";
  }

  const description =
    product.description?.replace?.(/<[^>]+>/g, " ") ??
    product.description ??
    "Imported from our CJ catalog.";
  document.getElementById("product-description").textContent =
    typeof description === "string" ? description.trim() : description;

  const infoBody = document.getElementById("accordion-info-body");
  const returnBody = document.getElementById("accordion-return-body");
  const shippingBody = document.getElementById("accordion-shipping-body");
  if (infoBody) {
    infoBody.innerHTML =
      product.productInfo ??
      `<p><strong>Category:</strong> ${product.categoryName ?? "—"}</p>`;
  }
  if (returnBody) returnBody.innerHTML = product.returnPolicy ?? "<p>See our return policy in the footer.</p>";
  if (shippingBody) shippingBody.innerHTML = product.shippingInfo ?? "<p>Ships from CJ warehouse.</p>";

  const mainImg = document.getElementById("product-main-img");
  if (product.image) {
    mainImg.src = wixImage(product.image, 900, 1100);
  } else {
    mainImg.src = mainImage;
  }
  mainImg.alt = name;

  const thumbs = document.querySelectorAll(".product-thumb");
  thumbs.forEach((btn, i) => {
    const img = btn.querySelector("img");
    const src = images[i] ?? images[0] ?? mainImage;
    if (img && src) {
      img.src = product.image ? wixImage(product.image, 120, 120) : src;
      img.alt = "";
    }
    btn.classList.toggle("is-active", i === 0);
  });

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(name);
  document.getElementById("share-facebook").href =
    `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  document.getElementById("share-pinterest").href =
    `https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareText}`;
  document.getElementById("share-whatsapp").href =
    `https://wa.me/?text=${shareText}%20${shareUrl}`;
  document.getElementById("share-x").href =
    `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
}

function showNotFound(message = "") {
  document.querySelector(".product-page")?.classList.add("product-page--missing");
  const layout = document.querySelector(".product-layout");
  if (layout) {
    const detail = message
      ? `<p class="product-missing-detail">${message}</p>`
      : "";
    layout.innerHTML = `
      <p class="product-missing">Product not found.</p>
      ${detail}
      <p><a href="/shop.html">Back to Shop All</a> · <a href="/">Home</a></p>
    `;
  }
  document.title = "Product | Baby Hug";
}

async function loadCjProduct(pid, sku) {
  const params = new URLSearchParams();
  if (pid) params.set("pid", pid);
  if (sku) params.set("sku", sku);

  if (!params.toString()) {
    showNotFound("Missing product id in the link.");
    return;
  }

  const res = await fetch(apiUrl(`/api/product?${params}`));

  if (!res.ok) {
    const raw = await res.text();
    console.error(`/api/product returned ${res.status}:`, raw);
    showNotFound(`Could not load product (${res.status}). Check that CJ_API_KEY is set on the server.`);
    return;
  }

  const data = await res.json();
  const product = data?.data;

  if (!data?.success || !product) {
    console.error("CJ product detail failed:", data);
    showNotFound(data?.message || data?.error || "This item is not available.");
    return;
  }

  renderProduct(product);
  initQuantity();
  initAccordions();
  initGallery(product);
  initAddToCart(product);
}

document.addEventListener("DOMContentLoaded", () => {
  initCart();
  initMobileNav();

  const params = new URLSearchParams(window.location.search);
  const pid = params.get("pid");
  const sku = params.get("sku");
  const slug = params.get("id");

  if (pid || sku) {
    loadCjProduct(pid, sku);
    return;
  }

  const product = slug ? getProductBySlug(slug) : null;

  if (!product) {
    showNotFound();
    return;
  }

  renderProduct(product);
  initQuantity();
  initAccordions();
  initGallery(product);
  initAddToCart(product);
});
