import { initAuth } from "./auth.js";
import { initStoreCurrency } from "./currency.js";
import { initFirebase } from "./firebase.js";
import { initI18n } from "./i18n.js";

/** Run once before any page logic (currency, Firebase, auth, translations). */
export async function bootstrap() {
  try {
    await initStoreCurrency();
    await initFirebase();
    await initAuth();
    initI18n();
  } catch (err) {
    console.error("Bootstrap failed:", err);
    try {
      initI18n();
    } catch {
      /* ignore */
    }
  }
}
