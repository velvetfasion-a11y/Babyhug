import { initStoreCurrency } from "./currency.js";
import { initFirebase } from "./firebase.js";
import { initI18n } from "./i18n.js";
import { initAuthNav } from "./auth-nav.js";

/** Run once before any page logic (currency + translations). */
export async function bootstrap() {
  try {
    await Promise.all([initStoreCurrency(), initFirebase()]);
  } catch (err) {
    console.error("Bootstrap failed:", err);
  }
  initI18n();
  initAuthNav().catch((err) => console.warn("Auth nav init failed:", err));
}
