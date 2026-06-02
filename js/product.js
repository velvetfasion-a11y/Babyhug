import {
  getProductBySlug,
  wixImage,
  formatPrice,
} from "./products.js";
import {
  formatProductPrice,
  parseImageUrl,
  productName,
} from "./cj-products.js";
import {
  storePriceNumber,
  getStoreConfig,
  formatStoreAmount,
} from "./currency.js";
import { fetchJson } from "./fetch-json.js";
import { t, localizeOptionLabel, applyProductStaticTranslations } from "./i18n.js";
import { bootstrap } from "./bootstrap.js";

let cartApi = null;
async function getCartApi() {
  if (!cartApi) cartApi = await import("./cart.js");
  return cartApi;
}

/** @typedef {{ name: string, values: string[] }} ProductOptionGroup */
/** @typedef {{ vid: string, variantSku?: string, variantKey?: string, variantSellPrice?: number, variantImage?: string, variantNameEn?: string }} CjVariant */

/** @type {CjVariant | null} */
let selectedVariant = null;
/** @type {Record<string, string>} */
let selectedOptions = {};

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

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim().startsWith("[")) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function splitVariantKey(key) {
  if (key == null || key === "") return [];
  const fromJson = parseJsonArray(key);
  if (fromJson?.length) return fromJson.map(String);
  return String(key)
    .split("-")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** @returns {string[]} */
function getOptionNames(product) {
  const variants = product.variants ?? [];
  const maxParts = Math.max(
    0,
    ...variants.map((v) => splitVariantKey(v.variantKey ?? v.variantKeyEn).length)
  );

  let names = null;

  const fromEnSet = parseJsonArray(product.productKeyEn);
  if (fromEnSet?.length) {
    names = fromEnSet.map(String);
  }

  const en = product.productKeyEn;
  if (!names?.length && typeof en === "string" && en.includes("-") && !en.startsWith("[")) {
    names = en
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!names?.length && typeof en === "string" && en.trim() && !en.startsWith("[")) {
    names = [en.trim()];
  }

  if (!names?.length) {
    const fromSet = parseJsonArray(product.productKeySet);
    if (fromSet?.length) names = fromSet.map(String);
  }

  if (!names?.length && variants.length) {
    const keyEn = parseJsonArray(variants[0].variantKeyEn);
    if (keyEn?.length) names = keyEn.map(String);
  }

  if (!names?.length) {
    const sampleLen = splitVariantKey(variants[0]?.variantKey ?? variants[0]?.variantKeyEn).length;
    const count = Math.max(sampleLen, maxParts);
    names = Array.from({ length: count }, (_, i) =>
      t("product.option", { n: i + 1 })
    );
  }

  return padOptionNames(names.map(localizeOptionLabel), maxParts);
}

function padOptionNames(names, targetLength) {
  if (!targetLength || names.length >= targetLength) return names;
  const out = [...names];
  while (out.length < targetLength) {
    out.push(`Option ${out.length + 1}`);
  }
  return out;
}

/** @returns {ProductOptionGroup[]} */
function buildOptionGroups(product) {
  const variants = product.variants ?? [];
  const optionNames = getOptionNames(product);
  if (!variants.length || !optionNames.length) return [];

  const valueSets = optionNames.map(() => new Set());

  for (const variant of variants) {
    const parts = splitVariantKey(variant.variantKey ?? variant.variantKeyEn);
    parts.forEach((val, i) => {
      if (i < valueSets.length) valueSets[i].add(val);
    });
  }

  return optionNames.map((name, i) => ({
    name,
    values: [...valueSets[i]],
  }));
}

/** @param {Record<string, string>} selections */
function findVariant(product, selections) {
  const variants = product.variants ?? [];
  const optionNames = getOptionNames(product);
  if (!variants.length) return null;

  if (!optionNames.length) return variants[0] ?? null;

  return (
    variants.find((variant) => {
      const parts = splitVariantKey(variant.variantKey ?? variant.variantKeyEn);
      return optionNames.every((name, i) => selections[name] === parts[i]);
    }) ?? null
  );
}

function variantDisplayPrice(variant, product) {
  if (product?.adminPriceLocal != null) return product.adminPriceLocal;
  if (
    product?.price != null &&
    !variant?.variantSellPrice &&
    !product?.sellPrice
  ) {
    return Number(product.price) * (getStoreConfig().rate ?? 1);
  }
  const sell = variant?.variantSellPrice ?? product?.sellPrice;
  return storePriceNumber(sell);
}

function updatePriceDisplay(product, variant) {
  const priceEl = document.getElementById("product-price");
  if (!priceEl) return;

  priceEl.classList.remove("product-detail-price--sale");

  if (product.originalPrice) {
    priceEl.innerHTML = `<s>${formatPrice(product.originalPrice)}</s> <span>${formatPrice(product.price)}</span>`;
    priceEl.classList.add("product-detail-price--sale");
    return;
  }

  if (product.price != null && !product.sellPrice && !variant?.variantSellPrice) {
    priceEl.textContent = formatPrice(product.price);
    return;
  }

  if (product.adminPriceDisplay) {
    priceEl.textContent = product.adminPriceDisplay;
    return;
  }

  const sell = variant?.variantSellPrice ?? product?.sellPrice;
  priceEl.textContent = sell
    ? formatProductPrice({ ...product, sellPrice: sell })
    : formatStoreAmount(variantDisplayPrice(variant, product));
}

function updateSkuDisplay(product, variant) {
  const skuEl = document.getElementById("product-sku");
  if (!skuEl) return;
  skuEl.textContent = "";
  skuEl.hidden = true;
}

function updateMainImage(product, variant) {
  const mainImg = document.getElementById("product-main-img");
  if (!mainImg) return;

  const name = productName(product);
  let src = "";

  if (product.image) {
    src = wixImage(product.image, 900, 1100);
  } else if (variant?.variantImage) {
    src = variant.variantImage;
  } else {
    const images = parseCjImages(product);
    src = images[0] ?? "";
  }

  if (src) {
    mainImg.src = src;
    mainImg.alt = variant?.variantNameEn
      ? `${name} — ${variant.variantNameEn}`
      : name;
  }
}

function syncVariantSelection(product) {
  selectedVariant = findVariant(product, selectedOptions);
  updatePriceDisplay(product, selectedVariant);
  updateSkuDisplay(product, selectedVariant);
  updateMainImage(product, selectedVariant);

  const addBtn = document.getElementById("add-to-cart");
  if (addBtn) {
    const hasVariants = (product.variants?.length ?? 0) > 0;
    const ready = !hasVariants || Boolean(selectedVariant?.vid);
    addBtn.disabled = !ready;
    addBtn.textContent = ready ? t("product.addToCart") : t("product.selectOptions");
  }
}

function renderVariantSelectors(product) {
  const container = document.getElementById("product-options");
  if (!container) return;

  const groups = buildOptionGroups(product);
  const variants = product.variants ?? [];

  if (groups.length <= 1 && groups[0]?.values.length <= 1 && variants.length <= 1) {
    container.hidden = true;
    container.innerHTML = "";
    selectedVariant = variants[0] ?? null;
    selectedOptions = {};
    if (groups[0]?.values[0] && groups[0].name) {
      selectedOptions[groups[0].name] = groups[0].values[0];
    }
    syncVariantSelection(product);
    return;
  }

  container.hidden = false;
  const productId = product.pid ?? product.productId ?? "product";

  container.innerHTML = groups
    .map((group) => {
      const fieldsetId = `option-${productId}-${group.name.replace(/\s+/g, "-")}`;
      const radios = group.values
        .map((value) => {
          const inputId = `${fieldsetId}-${value.replace(/\s+/g, "-")}`;
          const checked = selectedOptions[group.name] === value;
          return `
            <label class="product-option-value">
              <input
                type="radio"
                name="${fieldsetId}"
                id="${inputId}"
                value="${escapeAttr(value)}"
                data-option-name="${escapeAttr(group.name)}"
                ${checked ? "checked" : ""}
              />
              <span>${escapeHtml(value)}</span>
            </label>
          `;
        })
        .join("");

      return `
        <fieldset class="product-option-group" data-option="${escapeAttr(group.name)}">
          <legend class="product-option-label">${escapeHtml(group.name)}</legend>
          <div class="product-option-values" role="radiogroup" aria-label="${escapeAttr(group.name)}">
            ${radios}
          </div>
        </fieldset>
      `;
    })
    .join("");

  container.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const optionName = input.dataset.optionName;
      selectedOptions[optionName] = input.value;
      syncVariantSelection(product);
    });
  });

  syncVariantSelection(product);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

function initGallery(product) {
  const mainImg = document.getElementById("product-main-img");
  const thumbs = document.querySelectorAll(".product-thumb");
  if (!mainImg || !thumbs.length) return;

  const images = product.image
    ? [product.image, product.image, product.image]
    : parseCjImages(product);
  const name = productName(product);

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

function buildCartItem(product) {
  if (product.slug && getProductBySlug(product.slug)) {
    const p = getProductBySlug(product.slug);
    return {
      id: product.slug,
      slug: product.slug,
      name: p.name,
      image: wixImage(p.image, 160, 160),
      price: Number(p.price) * (getStoreConfig().rate ?? 1),
    };
  }

  const variant = selectedVariant;
  const pid = product.pid ?? product.productId;
  const vid = variant?.vid;
  const variantSku = variant?.variantSku ?? product.productSku ?? product.sku ?? "";

  const id = vid
    ? `cj-vid-${vid}`
    : pid
      ? `cj-${pid}`
      : variantSku
        ? `cj-${variantSku}`
        : `cj-${Date.now()}`;

  const price = variantDisplayPrice(variant ?? null, product);

  const baseName = productName(product);
  const name = variant?.variantNameEn
    ? `${baseName} — ${variant.variantNameEn}`
    : variant?.variantKey
      ? `${baseName} — ${variant.variantKey}`
      : baseName;

  const image = variant?.variantImage
    ? variant.variantImage
    : product.image
      ? wixImage(product.image, 160, 160)
      : parseImageUrl(product);

  return {
    id,
    vid: vid ? String(vid) : undefined,
    variantSku: variantSku || undefined,
    pid: pid ? String(pid) : undefined,
    sku: variantSku || undefined,
    name,
    image,
    price,
  };
}

function initAddToCart(product) {
  const btn = document.getElementById("add-to-cart");
  if (!btn) return;

  const handler = async () => {
    if (btn.disabled) return;

    const qty = document.getElementById("product-qty")?.value || "1";
    const item = buildCartItem(product);
    const cart = await getCartApi();

    if (item.slug && getProductBySlug(item.slug)) {
      cart.addToCart(item.slug, qty);
    } else {
      cart.addToCartItem(item, qty);
    }
    cart.openCartDrawer();
  };

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("add-to-cart")?.addEventListener("click", handler);
}

function parseCjImages(product) {
  let images = [];
  if (product.bigImage) images.push(product.bigImage);

  const raw = product.productImageSet ?? product.productImage;
  if (Array.isArray(raw)) images.push(...raw);
  else if (typeof raw === "string" && raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) images.push(...parsed);
      else images.push(raw);
    } catch {
      images.push(raw);
    }
  } else if (raw) images.push(raw);

  const variantImages = (product.variants ?? [])
    .map((v) => v.variantImage)
    .filter(Boolean);
  return [...new Set([...images, ...variantImages].filter(Boolean))];
}

function normalizeCjProduct(raw) {
  if (!raw) return raw;
  const name = productName(raw);
  return {
    ...raw,
    pid: raw.pid ?? raw.productId,
    productId: raw.productId ?? raw.pid,
    sku: raw.sku ?? raw.productSku,
    productSku: raw.productSku ?? raw.sku,
    nameEn: name,
    productNameEn: name,
    sellPrice: raw.sellPrice,
    bigImage: raw.bigImage || parseImageUrl(raw),
    variants: raw.variants ?? [],
  };
}

function showProductLoading() {
  document.querySelector(".product-page")?.classList.add("product-page--loading");
  const title = document.getElementById("product-title");
  const price = document.getElementById("product-price");
  const mainImg = document.getElementById("product-main-img");
  if (title) title.textContent = "Loading…";
  if (price) price.textContent = "…";
  if (mainImg) mainImg.removeAttribute("src");
}

function hideProductLoading() {
  document.querySelector(".product-page")?.classList.remove("product-page--loading");
}

function initDefaultSelections(product) {
  const groups = buildOptionGroups(product);
  selectedOptions = {};

  for (const group of groups) {
    if (group.values[0]) selectedOptions[group.name] = group.values[0];
  }

  selectedVariant = findVariant(product, selectedOptions) ?? product.variants?.[0] ?? null;
}

function renderProduct(product) {
  hideProductLoading();
  product = product.slug ? product : normalizeCjProduct(product);

  const name = productName(product);
  const images = product.image ? [product.image] : parseCjImages(product);
  const mainImage = images[0] ?? "";

  document.title = `${name} | Baby Hug`;

  const titleEl = document.getElementById("product-title");
  if (titleEl) titleEl.textContent = name;

  let description = t("product.defaultDesc");
  if (typeof product.description === "string") {
    description = product.description.replace(/<[^>]+>/g, " ").trim() || description;
  }
  const descEl = document.getElementById("product-description");
  if (descEl) descEl.textContent = description;

  const infoBody = document.getElementById("accordion-info-body");
  const returnBody = document.getElementById("accordion-return-body");
  const shippingBody = document.getElementById("accordion-shipping-body");
  if (infoBody) {
    infoBody.innerHTML =
      product.productInfo ??
      `<p><strong>Category:</strong> ${product.categoryName ?? "—"}</p>`;
  }
  if (returnBody) {
    returnBody.innerHTML =
      product.returnPolicy ?? `<p>${t("product.defaultReturns")}</p>`;
  }
  if (shippingBody) {
    shippingBody.innerHTML =
      product.shippingInfo ?? `<p>${t("product.defaultShipping")}</p>`;
  }

  const mainImg = document.getElementById("product-main-img");
  if (mainImg) {
    const imgSrc = product.image
      ? wixImage(product.image, 900, 1100)
      : mainImage;
    if (imgSrc) {
      mainImg.src = imgSrc;
      mainImg.alt = name;
    }
  }

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

  try {
    initDefaultSelections(product);
    renderVariantSelectors(product);
  } catch (err) {
    console.error("Variant UI error:", err);
    selectedVariant = product.variants?.[0] ?? null;
    const options = document.getElementById("product-options");
    if (options) {
      options.hidden = true;
      options.innerHTML = "";
    }
  }
  updateSkuDisplay(product, selectedVariant);
  updatePriceDisplay(product, selectedVariant);

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(name);
  const fb = document.getElementById("share-facebook");
  const pin = document.getElementById("share-pinterest");
  const wa = document.getElementById("share-whatsapp");
  const x = document.getElementById("share-x");
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
  if (pin) pin.href = `https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareText}`;
  if (wa) wa.href = `https://wa.me/?text=${shareText}%20${shareUrl}`;
  if (x) x.href = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;

  try {
    applyProductStaticTranslations();
  } catch (err) {
    console.warn("Translations skipped:", err);
  }
}

function showNotFound(message = "") {
  document.querySelector(".product-page")?.classList.add("product-page--missing");
  const layout = document.querySelector(".product-layout");
  if (layout) {
    const detail = message
      ? `<p class="product-missing-detail">${message}</p>`
      : "";
    layout.innerHTML = `
      <p class="product-missing">${t("product.notFound")}</p>
      ${detail}
      <p><a href="shop.html">${t("product.backShop")}</a> · <a href="index.html">${t("product.home")}</a></p>
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

  try {
    const { res, data } = await fetchJson(`/api/product?${params}`, {}, 20000);

    if (!res.ok) {
      console.error(`/api/product returned ${res.status}:`, data);
      showNotFound(
        `Could not load product (${res.status}). Run: lsof -ti:3000 | xargs kill, then npm run dev`
      );
      return;
    }

    const product = normalizeCjProduct(data?.data);

    const ok =
      data?.success === true || data?.result === true || Number(data?.code) === 200;

    if (!ok || !product) {
      console.error("CJ product detail failed:", data);
      showNotFound(data?.message || data?.error || "This item is not available.");
      return;
    }

    try {
      renderProduct(product);
      initQuantity();
      initAccordions();
      initGallery(product);
      initAddToCart(product);
    } catch (renderErr) {
      console.error("Render error:", renderErr);
      showNotFound(renderErr?.message || "Could not display this product.");
    }
  } catch (err) {
    console.error("Product load error:", err);
    showNotFound(err?.message || "Could not load this product. Please try again.");
  }
}

async function bootProductPage() {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get("pid");
  const sku = params.get("sku");
  const slug = params.get("id");

  initMobileNav();

  if (pid || sku) {
    showProductLoading();
    await bootstrap();
    await loadCjProduct(pid, sku);
    const { whenIdle } = await import("./perf.js");
    whenIdle(async () => {
      const cart = await getCartApi();
      cart.initCart();
    });
    return;
  }

  await bootstrap();
  const { whenIdle } = await import("./perf.js");
  whenIdle(async () => {
    const cart = await getCartApi();
    cart.initCart();
  });

  if (!slug) {
    window.location.replace("shop.html");
    return;
  }

  const product = getProductBySlug(slug);

  if (!product) {
    showNotFound();
    return;
  }

  renderProduct(product);
  initQuantity();
  initAccordions();
  initGallery(product);
  initAddToCart(product);
}

function startProductPage() {
  bootProductPage().catch((err) => {
    console.error("Product page boot failed:", err);
    showNotFound(err?.message || "Something went wrong loading this page. Please refresh.");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startProductPage);
} else {
  startProductPage();
}
