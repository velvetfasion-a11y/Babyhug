/**
 * Baby Hug login — vanilla JS + Firebase v9+ modular SDK.
 * Imports auth/db from private ./firebase-config.js (gitignored).
 */
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const HOME_URL = "index.html";

const els = {
  form: document.getElementById("auth-form"),
  email: document.getElementById("auth-email"),
  password: document.getElementById("auth-password"),
  error: document.getElementById("auth-error"),
  submit: document.getElementById("auth-submit"),
  google: document.getElementById("google-sign-in"),
  status: document.getElementById("auth-status"),
  heading: document.getElementById("login-heading"),
  lead: document.getElementById("login-lead"),
  tabSignIn: document.getElementById("tab-sign-in"),
  tabRegister: document.getElementById("tab-register"),
};

let mode = "sign-in";
let redirecting = false;

/**
 * Ensure users/{uid} exists. New users: { email, role: "user", wishlist: [] }
 * Reuse on profile.html: import { ensureUserProfile } from "./login.js";
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

/** Redirect if already signed in when visiting login.html */
onAuthStateChanged(auth, (user) => {
  if (user) completeAuth(user);
});

function setBusy(busy) {
  if (els.submit) els.submit.disabled = busy;
  if (els.google) els.google.disabled = busy;
  if (els.status) els.status.hidden = !busy;
}

function showError(message) {
  if (els.error) els.error.textContent = message || "";
}

function authErrorMessage(err) {
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  };
  return map[err?.code] ?? err?.message ?? "Something went wrong. Please try again.";
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
    showError(authErrorMessage(err));
    setBusy(false);
  }
});

els.google?.addEventListener("click", async () => {
  showError("");
  setBusy(true);

  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await completeAuth(credential.user);
  } catch (err) {
    showError(authErrorMessage(err));
    setBusy(false);
  }
});

setMode("sign-in");
