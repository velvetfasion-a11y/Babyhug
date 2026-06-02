import admin from "firebase-admin";

let firestore = null;

export function isFirebaseAdminEnabled() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

/** @returns {import("firebase-admin/firestore").Firestore | null} */
export function getAdminFirestore() {
  if (firestore) return firestore;
  if (!isFirebaseAdminEnabled()) return null;

  try {
    if (!admin.apps.length) {
      let credential;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        credential = admin.credential.cert(serviceAccount);
      } else {
        credential = admin.credential.applicationDefault();
      }
      admin.initializeApp({ credential });
    }
    firestore = admin.firestore();
    return firestore;
  } catch (err) {
    console.warn("[Firebase Admin] Init failed:", err.message);
    return null;
  }
}
