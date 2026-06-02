import { initializeApp } from "https://esm.sh/firebase@12.14.0/app";
import {
  getAnalytics,
  isSupported,
} from "https://esm.sh/firebase@12.14.0/analytics";
import { getAuth } from "https://esm.sh/firebase@12.14.0/auth";
import { getFirestore } from "https://esm.sh/firebase@12.14.0/firestore";
import { loadFirebaseConfig } from "./firebase-config.js";

let app = null;
let auth = null;
let db = null;
let analytics = null;
let resolvedConfig = null;

export function isFirebaseConfigured() {
  const key = resolvedConfig?.apiKey ?? "";
  return Boolean(key) && Boolean(resolvedConfig?.projectId);
}

/** Initialize Firebase once (browser only). */
export async function initFirebase() {
  if (typeof window === "undefined") {
    return { app: null, auth: null, db: null, analytics: null };
  }
  if (app) return { app, auth, db, analytics };

  resolvedConfig = await loadFirebaseConfig();
  if (!isFirebaseConfigured()) throw new Error("Firebase config is not set");

  try {
    app = initializeApp(resolvedConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (await isSupported()) {
      analytics = getAnalytics(app);
    }

    return { app, auth, db, analytics };
  } catch (err) {
    console.error("Firebase init failed:", err);
    throw err;
  }
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirebaseDb() {
  return db;
}

export function getFirebaseAnalytics() {
  return analytics;
}
