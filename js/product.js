import {
  getProductBySlug,
  wixImage,
  formatPrice,
} from "./products.js";
import {
  fetchAllCJProducts,
  formatProductPrice,
  normalizeListProduct,
  parseImageUrl,
  productIds,
  productName,
  productPageUrl,
} from "./cj-products.js";
import {
  storePriceNumber,
  getStoreConfig,
  formatStoreAmount,
} from "./currency.js";
import { fetchJson } from "./fetch-json.js";
import { t, applyProductStaticTranslations } from "./i18n.js";
import { bootstrap } from "./bootstrap.js";
import {
  buildOptionGroups,
  defaultSelections,
  findVariant,
  optionsArrayFromSelections,
  selectionLabel,
  shouldShowVariantUi,
} from "./product-variants.js";
import { isInWishlist, toggleWishlist } from "./wishlist.js";
import { whenAuthReady, saveWishlistItemToFirestore } from "./user-firestore.js";

let cartApi = null;
async function getCartApi() {
  if (!cartApi) cartApi = await import("./cart.js");
  return cartApi;
}

/** @type {import('./product-variants.js').CjVariant | null} */
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
  const sku =
    variant?.variantSku ??
    product.sku ??
    product.productSku ??
    "";
  skuEl.textContent = sku ? t("product.sku", { sku }) : "";
}

function updateMainImage(product, variant) {
  const mainImg = document.getElementById("product-main-img");
  if (!mainImg) return;

  const name = product.name ?? productName(product);
  let src = "";

  if (variant?.variantImage) {
    src = variant.variantImage;
  } else if (product.image) {
    src = wixImage(product.image, 900, 1100);
  } else {
    const images = parseCjImages(product);
    src = images[0] ?? "";
  }

  if (src) {
    mainImg.src = src;
    mainImg.alt = variant?.variantNameEn
      ? `${name} — ${variant.variantNameEn}`
      : selectionLabel(selectedOptions)
        ? `${name} — ${selectionLabel(selectedOptions)}`
        : name;
  }
}

function syncVariantSelection(product) {
  selectedVariant = findVariant(product, selectedOptions);
  updatePriceDisplay(product, selectedVariant);
  updateSkuDisplay(product, selectedVariant);
  updateMainImage(product, selectedVariant);
  updateWishlistButton(product);

  const addBtn = document.getElementById("add-to-cart");
  const wishBtn = document.getElementById("add-to-wishlist");
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const needsPick = hasVariants && shouldShowVariantUi(product);
  const ready = !needsPick || Boolean(selectedVariant?.vid);

  if (addBtn) {
    addBtn.disabled = !ready;
    addBtn.textContent = ready ? t("product.addToCart") : t("product.selectOptions");
  }
  if (wishBtn) wishBtn.disabled = !ready;
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

function renderVariantSelectors(product) {
  const container = document.getElementById("product-options");
  if (!container) return;

  const groups = buildOptionGroups(product);

  if (!shouldShowVariantUi(product)) {
    container.hidden = true;
    container.innerHTML = "";
    const defaults = defaultSelections(product);
    selectedOptions = defaults.selectedOptions;
    selectedVariant = defaults.selectedVariant;
    syncVariantSelection(product);
    return;
  }

  container.hidden = false;
  const productId = product.pid ?? product.productId ?? "product";

  container.innerHTML = groups
    .map((group) => {
      const fieldId = `option-${productId}-${group.name.replace(/\s+/g, "-")}`;
      const useSelect = group.values.length > 5;

      if (useSelect) {
        const options = group.values
          .map((value) => {
            const selected = selectedOptions[group.name] === value;
            return `<option value="${escapeAttr(value)}"${selected ? " selected" : ""}>${escapeHtml(value)}</option>`;
          })
          .join("");

        return `
          <div class="product-option-group" data-option="${escapeAttr(group.name)}">
            <label class="product-option-label" for="${fieldId}">${escapeHtml(group.name)}</label>
            <select
              id="${fieldId}"
              class="product-option-select"
              data-option-name="${escapeAttr(group.name)}"
              aria-label="${escapeAttr(group.name)}"
            >${options}</select>
          </div>
        `;
      }

      const radios = group.values
        .map((value) => {
          const inputId = `${fieldId}-${value.replace(/\s+/g, "-")}`;
          const checked = selectedOptions[group.name] === value;
          return `
            <label class="product-option-value">
              <input
                type="radio"
                name="${fieldId}"
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

  container.querySelectorAll(".product-option-select").forEach((select) => {
    select.addEventListener("change", () => {
      selectedOptions[select.dataset.optionName] = select.value;
      syncVariantSelection(product);
    });
  });

  container.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      selectedOptions[input.dataset.optionName] = input.value;
      syncVariantSelection(product);
    });
  });

  syncVariantSelection(product);
}

function buildLinePayload(product) {
  const variant = selectedVariant;
  const pid = product.pid ?? product.productId;
  const vid = variant?.vid;
  const variantSku = variant?.variantSku ?? product.productSku ?? product.sku ?? "";
  const options = optionsArrayFromSelections(selectedOptions);

  const id = vid
    ? `cj-vid-${vid}`
    : pid
      ? `cj-${pid}`
      : variantSku
        ? `cj-${variantSku}`
        : `cj-${Date.now()}`;

  const price = variantDisplayPrice(variant ?? null, product);
  const baseName = product.name ?? productName(product);
  const variantLabel = selectionLabel(selectedOptions);
  const name = variantLabel ? `${baseName} — ${variantLabel}` : baseName;

  const image = variant?.variantImage
    ? variant.variantImage
    : product.image
      ? wixImage(product.image, 160, 160)
      : parseImageUrl(product);

  return {
    id,
    vid: vid ? String(vid) : undefined,
    variantId: vid ? String(vid) : undefined,
    variantSku: variantSku || undefined,
    pid: pid ? String(pid) : undefined,
    sku: variantSku || undefined,
    name,
    image,
    price,
    href: productPageUrl(product),
    category: product.adminCategories?.[0] ?? product.adminCategory ?? "",
    selectedOptions: { ...selectedOptions },
    options,
  };
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
      selectedOptions: { ...selectedOptions },
      options: optionsArrayFromSelections(selectedOptions),
    };
  }

  return buildLinePayload(product);
}

function buildWishlistItem(product) {
  return buildLinePayload(product);
}

function updateWishlistButton(product) {
  const btn = document.getElementById("add-to-wishlist");
  if (!btn) return;
  const item = buildWishlistItem(product);
  const saved = isInWishlist(item);
  btn.classList.toggle("is-saved", saved);
  btn.setAttribute("aria-pressed", String(saved));
  const label = btn.querySelector(".btn-wishlist-label");
  if (label) {
    label.textContent = saved ? t("profile.removeWish") : t("profile.saveWishlist");
  }
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
      cart.addToCartItem({ ...item, qty: Number(qty) || 1 }, qty);
    }

    cart.openCartDrawer();
  };

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("add-to-cart")?.addEventListener("click", handler);
}

function initAddToWishlist(product) {
  const btn = document.getElementById("add-to-wishlist");
  if (!btn) return;

  const handler = async () => {
    if (btn.disabled) return;
    const item = buildWishlistItem(product);
    toggleWishlist(item);
    updateWishlistButton(product);

    await whenAuthReady();
    if (isInWishlist(item)) {
      await saveWishlistItemToFirestore(item);
    } else {
      const { removeWishlistItemFromFirestore } = await import("./user-firestore.js");
      await removeWishlistItemFromFirestore(item.id);
    }
  };

  btn.replaceWith(btn.cloneNode(true));
  document.getElementById("add-to-wishlist")?.addEventListener("click", handler);
  updateWishlistButton(product);
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
  let variants = raw.variants ?? raw.variantList ?? [];
  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch {
      variants = [];
    }
  }
  if (!Array.isArray(variants)) variants = [];

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
    variants,
  };
}

async function fetchFirestoreProduct(pid) {
  if (!pid) return null;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase-config.js");
    const snap = await getDoc(doc(db, "products", String(pid)));
    if (!snap.exists()) return null;
    return normalizeCjProduct({ ...snap.data(), pid: snap.id, productId: snap.id });
  } catch (err) {
    console.warn("Firestore product skipped:", err);
    return null;
  }
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

function renderProduct(product) {
  hideProductLoading();
  product = product.slug ? product : normalizeCjProduct(product);

  const name = product.name ?? productName(product);
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
    const defaults = defaultSelections(product);
    selectedOptions = defaults.selectedOptions;
    selectedVariant = defaults.selectedVariant;
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

async function findProductInClientCatalog(pid, sku) {
  try {
    const { products } = await fetchAllCJProducts();
    const pidStr = pid ? String(pid) : "";
    const skuStr = sku ? String(sku) : "";
    const hit = products.find((p) => {
      const { pid: id, sku: s } = productIds(p);
      if (skuStr && s === skuStr) return true;
      if (pidStr && id === pidStr) return true;
      return false;
    });
    return hit ? normalizeListProduct(hit) : null;
  } catch {
    return null;
  }
}

async function fetchProductFromApi(pid, sku) {
  const attempts = [];
  if (pid && sku) attempts.push(new URLSearchParams({ pid: String(pid), sku: String(sku) }));
  if (sku) attempts.push(new URLSearchParams({ sku: String(sku) }));
  if (pid) attempts.push(new URLSearchParams({ pid: String(pid) }));

  for (const params of attempts) {
    const { res, data } = await fetchJson(`/api/product?${params}`, {}, 20000);
    const ok =
      res.ok &&
      (data?.success === true || data?.result === true || Number(data?.code) === 200) &&
      data?.data;
    if (ok) return { product: normalizeCjProduct(data.data), catalogFallback: data.catalogFallback };
  }
  return null;
}

async function loadCjProduct(pid, sku) {
  const pidStr = pid ? String(pid) : "";
  const skuStr = sku ? String(sku) : "";

  if (!pidStr && !skuStr) {
    showNotFound("Missing product id in the link.");
    return;
  }

  try {
    let product = pidStr ? await fetchFirestoreProduct(pidStr) : null;

    if (!product) {
      let result = await fetchProductFromApi(pidStr, skuStr);

      if (!result) {
        const catalogHit = await findProductInClientCatalog(pidStr, skuStr);
        if (catalogHit) {
          const { pid: canonicalPid, sku: canonicalSku } = productIds(catalogHit);
          result = await fetchProductFromApi(canonicalPid, canonicalSku);
          if (!result) product = normalizeCjProduct(catalogHit);
        }
      }

      if (result?.product) product = result.product;

      if (!product) {
        showNotFound(
          "This product is no longer available. It may have been removed from our catalog."
        );
        return;
      }

      if (result?.catalogFallback && !product.variants?.length) {
        console.info("Showing catalog summary (full detail unavailable).");
      }
    }

    renderProduct(product);
    initQuantity();
    initAccordions();
    initGallery(product);
    initAddToCart(product);
    initAddToWishlist(product);
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
  await whenAuthReady();

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
  initAddToWishlist(product);
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
