import { getCurrentUser } from "./auth.js";
import {
  addWishlistItemCloud,
  removeWishlistItemCloud,
} from "./user-store.js";

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
  window.dispatchEvent(new CustomEvent("babyhug-wishlist-updated"));
}

export function getWishlist() {
  return readRaw();
}

export function replaceWishlist(list) {
  writeRaw(Array.isArray(list) ? list : []);
  return readRaw();
}

export function wishlistId(item) {
  return (
    item.id ??
    (item.pid ? `cj-${item.pid}` : null) ??
    (item.sku ? `cj-${item.sku}` : null)
  );
}

export function isInWishlist(item) {
  const id = wishlistId(item);
  if (!id) return false;
  return readRaw().some((w) => wishlistId(w) === id);
}

function normalizeEntry(item) {
  const id = wishlistId(item);
  if (!id) return null;
  return {
    id,
    pid: item.pid ?? item.productId ?? null,
    sku: item.sku ?? item.productSku ?? null,
    name: item.name,
    image: item.image,
    price: item.price,
    category: item.category ?? item.adminCategory ?? "",
    href: item.href ?? item.productUrl ?? null,
  };
}

async function syncAddToCloud(entry) {
  const user = getCurrentUser();
  if (!user) return;
  try {
    await addWishlistItemCloud(user.uid, entry);
  } catch (err) {
    console.warn("Wishlist cloud add failed:", err);
  }
}

async function syncRemoveFromCloud(id) {
  const user = getCurrentUser();
  if (!user) return;
  try {
    await removeWishlistItemCloud(user.uid, id);
  } catch (err) {
    console.warn("Wishlist cloud remove failed:", err);
  }
}

export function addToWishlist(item) {
  const entry = normalizeEntry(item);
  if (!entry) return readRaw();

  const list = readRaw();
  if (list.some((w) => wishlistId(w) === entry.id)) return list;

  list.push(entry);
  writeRaw(list);
  syncAddToCloud(entry);
  return list;
}

export function removeFromWishlist(id) {
  const list = readRaw().filter((w) => wishlistId(w) !== id);
  writeRaw(list);
  syncRemoveFromCloud(id);
  return list;
}

export function toggleWishlist(item) {
  const id = wishlistId(item);
  if (!id) return readRaw();
  if (isInWishlist(item)) return removeFromWishlist(id);
  return addToWishlist(item);
}
