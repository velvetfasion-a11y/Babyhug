import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase-config.js";

/** @type {import('firebase/auth').User | null} */
let currentUser = null;
let authReady = false;
/** @type {Array<(user: import('firebase/auth').User | null) => void>} */
const authWaiters = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authReady = true;
  authWaiters.splice(0).forEach((fn) => fn(user));
});

export function getAuthUser() {
  return currentUser;
}

export function whenAuthReady() {
  if (authReady) return Promise.resolve(currentUser);
  return new Promise((resolve) => {
    authWaiters.push(resolve);
  });
}

function lineKey(line) {
  return line.id ?? line.vid ?? line.pid ?? line.sku ?? null;
}

export async function saveCartLineToFirestore(line) {
  if (!currentUser) return false;

  const ref = doc(db, "users", currentUser.uid);
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
  if (!currentUser) return false;

  const ref = doc(db, "users", currentUser.uid);
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
  if (!currentUser || !id) return false;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const wishlist = (snap.data().wishlist ?? []).filter(
    (row) => lineKey(row) !== id
  );
  await updateDoc(ref, { wishlist });
  return true;
}
