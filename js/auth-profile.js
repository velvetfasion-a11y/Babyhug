/**
 * Firestore user profile (users/{uid}) — shared by login and profile pages.
 */
import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * @param {import('firebase/auth').User} user
 */
export async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  const profile = {
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    role: "user",
    wishlist: [],
    cart: [],
    createdAt: new Date().toISOString(),
  };

  await setDoc(ref, profile);
  return profile;
}

/**
 * @param {import('firebase/auth').User} user
 */
export async function loadUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return ensureUserProfile(user);
}

/**
 * @param {string} uid
 * @param {Record<string, unknown>} fields
 */
export async function updateUserProfileFields(uid, fields) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, fields);
}
