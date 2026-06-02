import { initAuth } from "./auth.js";
import { initStoreCurrency } from "./currency.js";
import { initFirebase } from "./firebase.js";
import { initI18n } from "./i18n.js";

/** Run once before any page logic (currency, Firebase, auth, translations). */
export async function bootstrap() {
  await initStoreCurrency();

  try {
    await initFirebase();
  } catch (err) {
    console.error("Firebase init failed in bootstrap:", err);
  }

  try {
    await initAuth();
  } catch (err) {
    console.error("Auth init failed in bootstrap:", err);
  }

  initI18n();
}
