import { whenAuthReady, saveWishlistItemToFirestore, removeWishlistItemFromFirestore } from "./user-firestore.js";

const WISHLIST_KEY = "babyhug-wishlist";

function readRaw() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeRaw(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

export function getWishlist() {
  return readRaw();
}

export function wishlistId(item) {
  return (
    item.id ??
    (item.vid || item.variantId ? `cj-vid-${item.vid ?? item.variantId}` : null) ??
    (item.pid ? `cj-${item.pid}` : null) ??
    (item.sku ? `cj-${item.sku}` : null)
  );
}

export function isInWishlist(item) {
  const id = wishlistId(item);
  if (!id) return false;
  return readRaw().some((w) => wishlistId(w) === id);
}

export function addToWishlist(item) {
  const id = wishlistId(item);
  if (!id) return readRaw();

  const list = readRaw();
  if (list.some((w) => wishlistId(w) === id)) return list;

  const entry = {
    id,
    pid: item.pid ?? item.productId ?? null,
    vid: item.vid ?? item.variantId ?? null,
    variantId: item.variantId ?? item.vid ?? null,
    sku: item.sku ?? item.productSku ?? item.variantSku ?? null,
    variantSku: item.variantSku ?? item.sku ?? null,
    name: item.name,
    image: item.image,
    price: item.price,
    category: item.category ?? item.adminCategory ?? "",
    href: item.href ?? item.productUrl ?? null,
    selectedOptions: item.selectedOptions ?? {},
    options: item.options ?? [],
  };

  list.push(entry);
  writeRaw(list);

  whenAuthReady().then(() => {
    saveWishlistItemToFirestore(entry).catch((err) =>
      console.warn("Firestore wishlist sync skipped:", err)
    );
  });

  return list;
}

export function removeFromWishlist(id) {
  const list = readRaw().filter((w) => wishlistId(w) !== id);
  writeRaw(list);

  whenAuthReady().then(() => {
    removeWishlistItemFromFirestore(id).catch((err) =>
      console.warn("Firestore wishlist remove skipped:", err)
    );
  });

  return list;
}

export function toggleWishlist(item) {
  const id = wishlistId(item);
  if (!id) return readRaw();
  if (isInWishlist(item)) return removeFromWishlist(id);
  return addToWishlist(item);
}
