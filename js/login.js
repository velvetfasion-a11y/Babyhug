/**
 * Baby Hug login — vanilla JS + Firebase v9+ modular SDK.
 * Imports auth and db from private ./firebase-config.js (same folder).
 *
 * Google OAuth Web client ID is configured in Firebase Console only — not in this file.
 */
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const HOME_URL = "index.html";

let mode = "sign-in";
let redirecting = false;

/** @type {ReturnType<typeof buildElements> | null} */
let els = null;

function buildElements() {
  return {
    form: document.getElementById("auth-form"),
    email: document.getElementById("auth-email"),
    password: document.getElementById("auth-password"),
    error: document.getElementById("auth-error"),
    submit: document.getElementById("auth-submit"),
    googleLoginBtn: document.getElementById("google-login-btn"),
    status: document.getElementById("auth-status"),
    heading: document.getElementById("login-heading"),
    lead: document.getElementById("login-lead"),
    tabSignIn: document.getElementById("tab-sign-in"),
    tabRegister: document.getElementById("tab-register"),
  };
}

/**
 * Ensure users/{uid} exists. New users: { email, role: "user", wishlist: [] }
 * @param {import('firebase/auth').User} user
 */
export async function ensureUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  const profile = {
    email: user.email,
    role: "user",
    wishlist: [],
  };

  await setDoc(ref, profile);
  return profile;
}

function setBusy(busy) {
  if (els.submit) els.submit.disabled = busy;
  if (els.googleLoginBtn) els.googleLoginBtn.disabled = busy;
  if (els.status) els.status.hidden = !busy;
}

function showError(message) {
  if (els.error) els.error.textContent = message || "";
}

function authErrorMessage(err) {
  const code = err?.code ?? "";
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/popup-blocked":
      "Popup blocked — trying full-page sign-in, or allow popups for this site.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/unauthorized-domain":
      "This site is not authorized. In Firebase: Authentication → Settings → Authorized domains — add this hostname.",
    "auth/operation-not-allowed":
      "Google sign-in is off. In Firebase: Authentication → Sign-in method → enable Google.",
    "auth/invalid-api-key": "Invalid Firebase API key in js/firebase-config.js.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  };
  const hint = map[code];
  if (hint) return hint;
  return err?.message || "Something went wrong. Please try again.";
}

async function completeAuth(user) {
  if (redirecting) return;
  redirecting = true;
  setBusy(true);
  showError("");

  try {
    await ensureUserProfile(user);
    window.location.href = HOME_URL;
  } catch (err) {
    console.error("ensureUserProfile failed:", err);
    showError("Signed in, but we could not set up your profile. Please try again.");
    redirecting = false;
    setBusy(false);
  }
}

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function handleGoogleSignIn() {
  showError("");
  setBusy(true);

  const provider = createGoogleProvider();

  signInWithPopup(auth, provider)
    .then((credential) => completeAuth(credential.user))
    .catch((error) => {
      console.error(error);

      if (error?.code === "auth/popup-blocked") {
        signInWithRedirect(auth, provider).catch((redirectError) => {
          console.error(redirectError);
          showError(authErrorMessage(redirectError));
          setBusy(false);
        });
        return;
      }

      showError(authErrorMessage(error));
      setBusy(false);
    });
}

async function finishGoogleRedirectIfNeeded() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await completeAuth(result.user);
    }
  } catch (error) {
    console.error(error);
    showError(authErrorMessage(error));
    setBusy(false);
  }
}

function setMode(next) {
  mode = next;
  const isRegister = mode === "register";

  els.tabSignIn?.classList.toggle("is-active", !isRegister);
  els.tabRegister?.classList.toggle("is-active", isRegister);

  if (els.heading) {
    els.heading.textContent = isRegister ? "Create account" : "Welcome back";
  }
  if (els.lead) {
    els.lead.textContent = isRegister
      ? "Create an account to save your wishlist."
      : "Sign in to your account.";
  }
  if (els.submit) {
    els.submit.textContent = isRegister ? "Create account" : "Sign in";
  }
  if (els.password) {
    els.password.autocomplete = isRegister ? "new-password" : "current-password";
  }

  showError("");
}

function bindEventListeners() {
  if (!els.googleLoginBtn) {
    console.error(
      'Google login button not found. Expected <button id="google-login-btn"> in login.html.'
    );
  } else {
    els.googleLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleGoogleSignIn();
    });
  }

  els.tabSignIn?.addEventListener("click", () => setMode("sign-in"));
  els.tabRegister?.addEventListener("click", () => setMode("register"));

  els.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    setBusy(true);

    const email = els.email?.value.trim() ?? "";
    const password = els.password?.value ?? "";

    try {
      const credential =
        mode === "register"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);

      await completeAuth(credential.user);
    } catch (err) {
      console.error(err);
      showError(authErrorMessage(err));
      setBusy(false);
    }
  });
}

async function initLoginPage() {
  els = buildElements();

  if (!auth) {
    console.error("Firebase auth is not initialized. Check js/firebase-config.js on the server.");
    showError("Sign-in is unavailable. Firebase configuration is missing on this server.");
    return;
  }

  setMode("sign-in");
  bindEventListeners();

  await finishGoogleRedirectIfNeeded();

  onAuthStateChanged(auth, (user) => {
    if (user && !redirecting) {
      completeAuth(user);
    }
  });
}

function startLoginApp() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initLoginPage().catch((err) => console.error(err));
    });
  } else {
    initLoginPage().catch((err) => console.error(err));
  }
}

startLoginApp();
