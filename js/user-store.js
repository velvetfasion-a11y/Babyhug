import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "https://esm.sh/firebase@12.14.0/firestore";
import { getFirebaseDb } from "./firebase.js";

const WISHLIST_KEY = "babyhug-wishlist";
const CART_KEY = "babyhug-cart";

function wishItemId(item) {
  return (
    item.id ??
    (item.pid ? `cj-${item.pid}` : null) ??
    (item.sku ? `cj-${item.sku}` : null)
  );
}

export function cartLineId(line) {
  return (
    line.id ??
    (line.vid ? `cj-vid-${line.vid}` : null) ??
    line.slug ??
    (line.pid ? `cj-${line.pid}` : line.sku ? `cj-${line.sku}` : null)
  );
}

function readLocalWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocalWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("babyhug-wishlist-updated"));
}

export function readLocalCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(list) {
  localStorage.setItem(CART_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("babyhug-cart-updated"));
}

function wishlistCol(uid) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore not initialized");
  return collection(db, "users", uid, "wishlist");
}

function cartCol(uid) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore not initialized");
  return collection(db, "users", uid, "cart");
}

function normalizeWishItem(item) {
  const id = wishItemId(item);
  if (!id) return null;
  return {
    id,
    pid: item.pid ?? null,
    sku: item.sku ?? null,
    name: item.name ?? "",
    image: item.image ?? "",
    price: item.price ?? null,
    category: item.category ?? "",
    href: item.href ?? null,
  };
}

function normalizeCartLine(line) {
  const id = cartLineId(line);
  if (!id) return null;
  const qty = Math.min(99, Math.max(1, parseInt(String(line.qty), 10) || 1));
  return {
    id,
    qty,
    name: line.name ?? "",
    image: line.image ?? "",
    price: Number(line.price) || 0,
    slug: line.slug ?? null,
    pid: line.pid ?? null,
    sku: line.sku ?? null,
    vid: line.vid ?? null,
    variantSku: line.variantSku ?? null,
  };
}

/** @returns {Promise<Array<object>>} */
export async function loadWishlistFromCloud(uid) {
  const snap = await getDocs(wishlistCol(uid));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function saveWishlistToCloud(uid, items) {
  const db = getFirebaseDb();
  if (!db) return;

  const normalized = items.map(normalizeWishItem).filter(Boolean);
  const snap = await getDocs(wishlistCol(uid));
  const batch = writeBatch(db);
  const nextIds = new Set(normalized.map((i) => i.id));

  snap.docs.forEach((d) => {
    if (!nextIds.has(d.id)) batch.delete(d.ref);
  });

  normalized.forEach((item) => {
    batch.set(doc(db, "users", uid, "wishlist", item.id), item);
  });

  await batch.commit();
}

export async function addWishlistItemCloud(uid, item) {
  const row = normalizeWishItem(item);
  if (!row) return;
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "users", uid, "wishlist", row.id), row);
}

export async function removeWishlistItemCloud(uid, id) {
  const db = getFirebaseDb();
  if (!db || !id) return;
  await deleteDoc(doc(db, "users", uid, "wishlist", id));
}

/** @returns {Promise<Array<object>>} */
export async function loadCartFromCloud(uid) {
  const snap = await getDocs(cartCol(uid));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function saveCartToCloud(uid, lines) {
  const db = getFirebaseDb();
  if (!db) return;

  const normalized = lines.map(normalizeCartLine).filter(Boolean);
  const snap = await getDocs(cartCol(uid));
  const batch = writeBatch(db);
  const nextIds = new Set(normalized.map((l) => l.id));

  snap.docs.forEach((d) => {
    if (!nextIds.has(d.id)) batch.delete(d.ref);
  });

  normalized.forEach((line) => {
    batch.set(doc(db, "users", uid, "cart", line.id), line);
  });

  await batch.commit();
}

export async function mergeLocalWishlistToCloud(uid) {
  const local = readLocalWishlist();
  let cloud = [];
  try {
    cloud = await loadWishlistFromCloud(uid);
  } catch (err) {
    console.warn("Could not load cloud wishlist:", err);
  }

  const byId = new Map();
  [...cloud, ...local].forEach((item) => {
    const id = wishItemId(item);
    if (id) byId.set(id, { ...item, id });
  });

  const merged = [...byId.values()];
  writeLocalWishlist(merged);

  try {
    await saveWishlistToCloud(uid, merged);
  } catch (err) {
    console.warn("Could not save wishlist to cloud:", err);
  }

  return merged;
}

export async function mergeLocalCartToCloud(uid) {
  const local = readLocalCart();
  let cloud = [];
  try {
    cloud = await loadCartFromCloud(uid);
  } catch (err) {
    console.warn("Could not load cloud cart:", err);
  }

  const byId = new Map();
  for (const line of [...cloud, ...local]) {
    const id = cartLineId(line);
    if (!id) continue;
    const prev = byId.get(id);
    const qty = Math.min(99, Math.max(1, parseInt(String(line.qty), 10) || 1));
    if (prev) {
      const combined = Math.min(
        99,
        (parseInt(String(prev.qty), 10) || 1) + qty
      );
      byId.set(id, { ...prev, ...line, id, qty: combined });
    } else {
      byId.set(id, { ...line, id, qty });
    }
  }

  const merged = [...byId.values()];
  writeLocalCart(merged);

  try {
    await saveCartToCloud(uid, merged);
  } catch (err) {
    console.warn("Could not save cart to cloud:", err);
  }

  return merged;
}

/** Merge wishlist + cart from localStorage into Firestore after sign-in. */
export async function mergeUserDataToCloud(uid) {
  await mergeLocalWishlistToCloud(uid);
  await mergeLocalCartToCloud(uid);
}
