import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase-config.js";

/** @type {import('firebase/auth').User | null} */
let currentUser = null;
let authReady = false;
/** @type {Array<(user: import('firebase/auth').User | null) => void>} */
const authWaiters = [];

if (auth) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (!authReady) {
      authReady = true;
      authWaiters.splice(0).forEach((fn) => fn(user));
    }
  });
}

/** Clear in-memory user after sign-out (auth listener also updates this). */
export function clearAuthCache() {
  currentUser = null;
}

/**
 * Wait until Firebase has restored the session (avoids false "signed out" on page load).
 * @returns {Promise<import('firebase/auth').User | null>}
 */
export async function whenAuthReady() {
  if (!auth) return null;

  try {
    await auth.authStateReady();
    currentUser = auth.currentUser;
    authReady = true;
    return auth.currentUser;
  } catch (err) {
    console.warn("authStateReady failed:", err);
    if (authReady) return currentUser;
    return new Promise((resolve) => {
      authWaiters.push(resolve);
    });
  }
}

export function getAuthUser() {
  return currentUser ?? auth?.currentUser ?? null;
}

function lineKey(line) {
  return line.id ?? line.vid ?? line.pid ?? line.sku ?? null;
}

export async function saveCartLineToFirestore(line) {
  const user = getAuthUser();
  if (!user) return false;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const cart = Array.isArray(snap.data().cart) ? [...snap.data().cart] : [];
  const key = lineKey(line);
  const idx = cart.findIndex((row) => lineKey(row) === key);

  if (idx >= 0) {
    const prev = cart[idx];
    cart[idx] = {
      ...prev,
      ...line,
      qty: Math.min(99, (Number(prev.qty) || 0) + (Number(line.qty) || 1)),
    };
  } else {
    cart.push({ ...line, qty: Number(line.qty) || 1 });
  }

  await updateDoc(ref, { cart });
  return true;
}

export async function saveWishlistItemToFirestore(item) {
  const user = getAuthUser();
  if (!user) return false;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const wishlist = Array.isArray(snap.data().wishlist)
    ? [...snap.data().wishlist]
    : [];
  const key = lineKey(item);
  const idx = wishlist.findIndex((row) => lineKey(row) === key);

  if (idx >= 0) {
    wishlist[idx] = { ...wishlist[idx], ...item };
  } else {
    wishlist.push(item);
  }

  await updateDoc(ref, { wishlist });
  return true;
}

export async function removeWishlistItemFromFirestore(id) {
  const user = getAuthUser();
  if (!user || !id) return false;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const wishlist = (snap.data().wishlist ?? []).filter(
    (row) => lineKey(row) !== id
  );
  await updateDoc(ref, { wishlist });
  return true;
}
