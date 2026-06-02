import { initStoreCurrency } from "./currency.js";
import { initFirebase } from "./firebase.js";
import { initI18n } from "./i18n.js";

/** Run once before any page logic (currency + translations). */
export async function bootstrap() {
  try {
    await Promise.all([initStoreCurrency(), initFirebase()]);
    initI18n();
  } catch (err) {
    console.error("Bootstrap failed:", err);
  }
}
