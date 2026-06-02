import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://esm.sh/firebase@12.14.0/auth";
import { getFirebaseAuth, isFirebaseConfigured, initFirebase } from "./firebase.js";
import { mergeUserDataToCloud } from "./user-store.js";

/** @type {import("https://esm.sh/firebase@12.14.0/auth").User | null} */
let currentUser = null;
/** @type {Array<(user: import("https://esm.sh/firebase@12.14.0/auth").User | null) => void>} */
const listeners = [];

function notify(user) {
  currentUser = user;
  listeners.forEach((fn) => {
    try {
      fn(user);
    } catch (err) {
      console.error("Auth listener error:", err);
    }
  });
}

export function getCurrentUser() {
  return currentUser;
}

export function isSignedIn() {
  return Boolean(currentUser);
}

export function onAuthChange(callback) {
  listeners.push(callback);
  callback(currentUser);
  return () => {
    const i = listeners.indexOf(callback);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function canUseAuth() {
  return isFirebaseConfigured();
}

/** Wait for first auth state (after Firebase is ready). */
export function initAuth() {
  return new Promise((resolve) => {
    if (!canUseAuth()) {
      notify(null);
      resolve(null);
      return;
    }

    initFirebase().then(() => {
      const auth = getFirebaseAuth();
      if (!auth) {
        notify(null);
        resolve(null);
        return;
      }

      let settled = false;
      const unsub = onAuthStateChanged(auth, async (user) => {
        notify(user);
        if (user) {
          try {
            await mergeUserDataToCloud(user.uid);
          } catch (err) {
            console.error("Account sync after sign-in:", err);
          }
        }
        if (!settled) {
          settled = true;
          resolve(user);
        }
      });
      return unsub;
    });
  });
}

export async function signInWithGoogle() {
  if (!canUseAuth()) {
    throw new Error("Firebase is not configured");
  }
  await initFirebase();
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth unavailable");

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}
