import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "https://esm.sh/firebase@12.14.0/auth";
import { t } from "./i18n.js";
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

/** User-facing message for Firebase Auth errors. */
export function mapAuthError(err) {
  const code = err?.code ?? "";
  const keyByCode = {
    "auth/invalid-email": "profile.errorInvalidEmail",
    "auth/user-disabled": "profile.errorUserDisabled",
    "auth/user-not-found": "profile.errorWrongCredentials",
    "auth/wrong-password": "profile.errorWrongCredentials",
    "auth/invalid-credential": "profile.errorWrongCredentials",
    "auth/email-already-in-use": "profile.errorEmailInUse",
    "auth/weak-password": "profile.errorWeakPassword",
    "auth/too-many-requests": "profile.errorTooManyRequests",
    "auth/operation-not-allowed": "profile.errorEmailNotEnabled",
  };
  const key = keyByCode[code];
  if (key) return t(key);
  return err?.message || t("profile.signInFailed");
}

async function ensureAuth() {
  if (!canUseAuth()) throw new Error("Firebase is not configured");
  await initFirebase();
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth unavailable");
  return auth;
}

export async function signInWithEmail(email, password) {
  const auth = await ensureAuth();
  const cred = await signInWithEmailAndPassword(
    auth,
    String(email).trim(),
    password
  );
  return cred.user;
}

export async function createAccountWithEmail(email, password, displayName = "") {
  const auth = await ensureAuth();
  const cred = await createUserWithEmailAndPassword(
    auth,
    String(email).trim(),
    password
  );
  const name = String(displayName).trim();
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  return cred.user;
}

export async function sendPasswordReset(email) {
  const auth = await ensureAuth();
  await sendPasswordResetEmail(auth, String(email).trim());
}
