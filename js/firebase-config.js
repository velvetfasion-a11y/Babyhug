/** Browser-safe config only — initialization lives in js/firebase.js */
export const firebaseConfig = {
  apiKey: "AIzaSyCWh9cXWSsbmslW9VY28iSgO1s4yLFIT5Q",
  projectId: "babyhug-bb69a",
  authDomain: "babyhug-bb69a.firebaseapp.com",
  storageBucket: "babyhug-bb69a.firebasestorage.app",
  messagingSenderId: "394763144155",
  appId: "1:394763144155:web:d6251c40df1f34216ef5fe",
  measurementId: "G-PJ342FREYH",
};

/**
 * Load runtime Firebase config from the server (env-backed), falling back to
 * the checked-in defaults above.
 */
export async function loadFirebaseConfig() {
  try {
    const res = await fetch("/api/firebase-config", { cache: "no-store" });
    if (!res.ok) return firebaseConfig;
    const data = await res.json();
    if (!data || typeof data !== "object") return firebaseConfig;
    return { ...firebaseConfig, ...data };
  } catch {
    return firebaseConfig;
  }
}
