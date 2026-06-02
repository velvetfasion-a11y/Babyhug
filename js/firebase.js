import { initializeApp } from "https://esm.sh/firebase@12.14.0/app";
import {
  getAnalytics,
  isSupported,
} from "https://esm.sh/firebase@12.14.0/analytics";
import { getAuth } from "https://esm.sh/firebase@12.14.0/auth";
import { getFirestore } from "https://esm.sh/firebase@12.14.0/firestore";
import { firebaseConfig } from "./firebase-config.js";

let app = null;
let auth = null;
let db = null;
let analytics = null;

export function isFirebaseConfigured() {
  const key = firebaseConfig?.apiKey ?? "";
  return (
    Boolean(key) &&
    !key.includes("YOUR_") &&
    key !== "YOUR_API_KEY" &&
    Boolean(firebaseConfig?.projectId) &&
    !firebaseConfig.projectId.includes("your-project")
  );
}

/** Initialize Firebase once (browser only). */
export async function initFirebase() {
  if (typeof window === "undefined") {
    return { app: null, auth: null, db: null, analytics: null };
  }
  if (app) return { app, auth, db, analytics };

  if (!isFirebaseConfigured()) {
    console.warn("Firebase: add your config in js/firebase-config.js");
    return { app: null, auth: null, db: null, analytics: null };
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (await isSupported()) {
      analytics = getAnalytics(app);
    }

    return { app, auth, db, analytics };
  } catch (err) {
    console.warn("Firebase init failed:", err);
    return { app: null, auth: null, db: null, analytics: null };
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
