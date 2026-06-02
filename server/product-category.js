const TOY_PATTERN =
  /\b(toy|toys|plush|doll|dolls|puzzle|game|games|playset|stuffed|teddy|rattle|teether|blocks|lego|figurine|playmat)\b/i;

const CLOTHING_PATTERN =
  /\b(romper|onesie|dress|shirt|pants|jacket|coat|outfit|clothing|bodysuit|jumpsuit|footie|sleeper|swaddle|bib|sock|shoes|sneaker|hat|bonnet|skirt|vest|cardigan|sweater|pajama|pyjama|wear|apparel|garment|knit|woven)\b/i;

function parseCjName(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(value);
      if (Array.isArray(arr)) return String(arr[0] ?? "");
    } catch {
      /* raw */
    }
  }
  return String(value);
}

export function productName(product) {
  const fromSet = Array.isArray(product.productNameSet)
    ? product.productNameSet[0]
    : null;
  return (
    parseCjName(fromSet) ||
    parseCjName(product.nameEn) ||
    parseCjName(product.productNameEn) ||
    parseCjName(product.productName) ||
    product.sku ||
    product.productSku ||
    "Product"
  );
}

function productCategoryText(product) {
  return [
    product.categoryFirstName,
    product.categorySecondName,
    product.categoryThreeName,
    product.categoryName,
  ]
    .filter(Boolean)
    .join(" ");
}

export function productSearchText(product) {
  return `${productName(product)} ${productCategoryText(product)}`.toLowerCase();
}

export function isOnSale(product) {
  if (product.discountPrice != null && product.discountPrice !== "") return true;
  if (Number(product.discountPriceRate) > 0) return true;
  const name = productName(product).toLowerCase();
  return /\b(sale|clearance|discount|markdown)\b/.test(name);
}

function isToyProduct(product) {
  const text = productSearchText(product);
  if (TOY_PATTERN.test(text)) return true;
  return (
    /\b(educational|learning|montessori)\b/i.test(text) &&
    /\b(baby|kid|child|toddler)\b/i.test(text)
  );
}

function isBoyProduct(product) {
  return /\bboys?\b/.test(productSearchText(product));
}

function isGirlProduct(product) {
  return /\bgirls?\b/.test(productSearchText(product));
}

function isClothingProduct(product) {
  const text = productSearchText(product);
  return (
    CLOTHING_PATTERN.test(text) ||
    /\b(baby|infant|newborn|toddler)\b/i.test(text)
  );
}

function isBestSeller(product) {
  const listed = Number(product.listedNum ?? product.listedShopNum ?? 0);
  return listed >= 25;
}

function isNewProduct(product) {
  const raw = product.createAt ?? product.createrTime ?? product.createTime;
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  const ms = ts > 1e12 ? ts : ts * 1000;
  const ageDays = (Date.now() - ms) / (24 * 60 * 60 * 1000);
  return ageDays >= 0 && ageDays <= 120;
}

/**
 * Admin / shop category label (matches storefront filters via adminCategory).
 */
export function inferAdminCategory(product) {
  if (isOnSale(product)) return "Sale";
  if (isToyProduct(product)) return "Childrens toys";
  if (isGirlProduct(product)) return "Girl";
  if (isBoyProduct(product)) return "Boy";

  const text = productSearchText(product);

  if (/\btoys?\b/.test(text) && /\b(kids?|babies|baby|children)\b/.test(text)) {
    return "Childrens toys";
  }

  if (isClothingProduct(product)) {
    if (/\bgirls?\b/.test(text)) return "Girl";
    if (/\bboys?\b/.test(text)) return "Boy";
    return "New in";
  }

  if (isBestSeller(product)) return "Best sellers";
  if (isNewProduct(product)) return "New in";

  return "New in";
}
