import { getAnalytics, isSupported } from "firebase/analytics";
import { app } from "./firebase-config.js";

let analytics = null;

/** Initialize Firebase Analytics when supported (app/auth/db live in firebase-config.js). */
export async function initFirebase() {
  if (typeof window === "undefined") return { app: null, analytics: null };

  try {
    if (await isSupported()) {
      analytics = getAnalytics(app);
    }
    return { app, analytics };
  } catch (err) {
    console.warn("Firebase analytics skipped:", err);
    return { app, analytics: null };
  }
}

export function getFirebaseApp() {
  return app;
}

export function getFirebaseAnalytics() {
  return analytics;
}
