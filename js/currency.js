import { fetchJson } from "./fetch-json.js";

/** @type {{ country: string, currency: string, locale: string, rate: number, priceAddOnUsd: number }} */
let storeConfig = {
  country: "US",
  currency: "USD",
  locale: "en-US",
  rate: 1,
  priceAddOnUsd: 15,
};

let initPromise = null;

export function getStoreConfig() {
  return storeConfig;
}

export function parseCjPrice(sellPrice) {
  if (sellPrice == null || sellPrice === "") return null;
  const n = parseFloat(String(sellPrice).split("-")[0]);
  return Number.isNaN(n) ? null : n;
}

/** USD catalog price + markup, converted to the visitor's currency. */
export function usdToStoreAmount(usdBase) {
  if (usdBase == null || Number.isNaN(usdBase)) return null;
  return (usdBase + storeConfig.priceAddOnUsd) * storeConfig.rate;
}

export function formatStorePrice(sellPriceOrUsdAmount, { isUsdBase = false } = {}) {
  const base = isUsdBase ? sellPriceOrUsdAmount : parseCjPrice(sellPriceOrUsdAmount);
  if (base == null) return "";

  const local = usdToStoreAmount(base);
  if (local == null) return "";

  try {
    return new Intl.NumberFormat(storeConfig.locale, {
      style: "currency",
      currency: storeConfig.currency,
      currencyDisplay: "narrowSymbol",
    }).format(local);
  } catch {
    return `${storeConfig.currency} ${local.toFixed(2)}`;
  }
}

/** Numeric price in store currency (for sorting / cart). */
export function storePriceNumber(sellPrice) {
  const base = parseCjPrice(sellPrice);
  if (base == null) return 0;
  return usdToStoreAmount(base) ?? 0;
}

/** Format a value already in store currency (e.g. cart line totals). */
export function formatStoreAmount(localAmount) {
  try {
    return new Intl.NumberFormat(storeConfig.locale, {
      style: "currency",
      currency: storeConfig.currency,
      currencyDisplay: "narrowSymbol",
    }).format(localAmount);
  } catch {
    return `${storeConfig.currency} ${Number(localAmount).toFixed(2)}`;
  }
}

export async function initStoreCurrency() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const countryOverride = params.get("country");
        const path = countryOverride
          ? `/api/store-config?country=${encodeURIComponent(countryOverride)}`
          : "/api/store-config";

        const { res, data } = await fetchJson(path, {}, 8000);
        if (res.ok && data) {
          storeConfig = { ...storeConfig, ...data };
        }
      } catch (err) {
        console.warn("Store currency config unavailable:", err);
      }
    })();
  }
  return initPromise;
}

/** Local Wix catalog prices (USD, no CJ markup). */
export function formatCatalogPriceUsd(usdPrice) {
  const local = Number(usdPrice) * storeConfig.rate;
  return formatStoreAmount(local);
}

/** Re-export for backwards compatibility. */
export const PRICE_ADD_ON = 15;
