/**
 * Baby Hug login — email/password + Google (Firebase Auth).
 */
import { auth } from "./firebase-config.js";
import { ensureUserProfile } from "./auth-profile.js";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

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

function safeRedirectPath(next) {
  if (!next || next.includes("://") || next.startsWith("//")) return "profile.html";
  const path = next.startsWith("/") ? next.slice(1) : next;
  if (!/^[a-z0-9./?=&_-]+$/i.test(path)) return "profile.html";
  return path;
}

function afterLoginUrl() {
  return safeRedirectPath(new URLSearchParams(window.location.search).get("next"));
}

function isLocalDev() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
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
    "auth/unauthorized-domain": () => {
      const host = window.location.hostname;
      return `“${host}” is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.`;
    },
    "auth/operation-not-allowed":
      "Google sign-in is off. Enable Google under Firebase Authentication → Sign-in method.",
    "auth/invalid-api-key": "Invalid Firebase API key in js/firebase-config.js.",
    "auth/permission-denied":
      "Could not save your profile. Check Firestore rules allow users/{uid} create for signed-in users.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  };
  const hint = map[code];
  if (typeof hint === "function") return hint();
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
    window.location.href = afterLoginUrl();
  } catch (err) {
    console.error("ensureUserProfile failed:", err);
    redirecting = false;
    setBusy(false);
    showError(authErrorMessage(err));
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

  const signIn = isLocalDev()
    ? () => signInWithPopup(auth, provider)
    : () =>
        signInWithPopup(auth, provider).catch((error) => {
          if (
            error?.code === "auth/popup-blocked" ||
            error?.code === "auth/popup-closed-by-user"
          ) {
            return signInWithRedirect(auth, provider);
          }
          throw error;
        });

  signIn()
    .then((credential) => {
      if (credential?.user) return completeAuth(credential.user);
    })
    .catch((error) => {
      console.error(error);
      if (error?.code === "auth/popup-blocked" && !isLocalDev()) {
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
  els.googleLoginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    handleGoogleSignIn();
  });

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
    showError("Sign-in is unavailable. Firebase configuration is missing on this server.");
    return;
  }

  setMode("sign-in");
  bindEventListeners();

  await finishGoogleRedirectIfNeeded();
}

function startLoginApp() {
  const run = () => initLoginPage().catch((err) => console.error(err));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}

startLoginApp();
