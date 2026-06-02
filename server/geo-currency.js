/** CJ catalog prices are in USD. */
export const PRICE_ADD_ON_USD = 15;

const EURO_ZONE = new Set([
  "AT", "BE", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT",
  "LU", "MT", "NL", "PT", "SK", "SI", "ES", "HR", "AD", "MC", "SM", "VA",
]);

/** ISO 3166-1 alpha-2 → ISO 4217 */
const COUNTRY_CURRENCY = {
  SE: "SEK",
  US: "USD",
  GB: "GBP",
  UK: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  NO: "NOK",
  DK: "DKK",
  CH: "CHF",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  MX: "MXN",
  BR: "BRL",
  SG: "SGD",
  HK: "HKD",
  KR: "KRW",
  TR: "TRY",
  ZA: "ZAR",
};

const CURRENCY_LOCALE = {
  SEK: "sv-SE",
  USD: "en-US",
  EUR: "fr-FR",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  NOK: "nb-NO",
  DKK: "da-DK",
  CHF: "de-CH",
  PLN: "pl-PL",
};

let ratesCache = { rates: { USD: 1 }, fetchedAt: 0 };
const RATES_TTL_MS = 6 * 60 * 60 * 1000;

const FRANKFURTER_CURRENCIES = [
  "USD", "SEK", "EUR", "GBP", "CAD", "AUD", "NOK", "DKK", "CHF", "PLN",
  "CZK", "HUF", "RON", "JPY", "CNY", "INR", "MXN", "BRL", "NZD", "SGD",
  "HKD", "KRW", "TRY", "ZAR",
];

export function normalizeCountry(code) {
  if (!code || typeof code !== "string") return null;
  const cc = code.trim().toUpperCase();
  if (cc === "UK") return "GB";
  if (/^[A-Z]{2}$/.test(cc)) return cc;
  return null;
}

export function currencyForCountry(countryCode) {
  const cc = normalizeCountry(countryCode);
  if (!cc) return "USD";
  if (COUNTRY_CURRENCY[cc]) return COUNTRY_CURRENCY[cc];
  if (EURO_ZONE.has(cc)) return "EUR";
  return "USD";
}

export function localeForCurrency(currency, countryCode) {
  const cc = normalizeCountry(countryCode);
  if (cc === "SE") return "sv-SE";
  if (cc === "US") return "en-US";
  if (cc === "GB") return "en-GB";
  if (cc === "FR") return "fr-FR";
  if (cc === "DE") return "de-DE";
  return CURRENCY_LOCALE[currency] ?? "en-US";
}

function countryFromAcceptLanguage(header) {
  if (!header) return null;
  const parts = header.split(",")[0]?.trim();
  const match = parts?.match(/-([A-Za-z]{2})$/);
  return match ? normalizeCountry(match[1]) : null;
}

export function detectCountry(req) {
  const override = normalizeCountry(req.query?.country);
  if (override) return override;

  const headers = req.headers;
  const fromHeader =
    headers["cf-ipcountry"] ||
    headers["x-vercel-ip-country"] ||
    headers["x-country-code"] ||
    headers["cloudfront-viewer-country"];
  const fromHdr = normalizeCountry(fromHeader);
  if (fromHdr && fromHdr !== "XX" && fromHdr !== "T1") return fromHdr;

  const host = String(headers.host ?? "").toLowerCase();
  if (host.includes("babyhug.se")) return "SE";

  const fromLang = countryFromAcceptLanguage(headers["accept-language"]);
  if (fromLang) return fromLang;

  return "US";
}

async function fetchUsdRates() {
  if (Date.now() - ratesCache.fetchedAt < RATES_TTL_MS && ratesCache.rates.USD === 1) {
    return ratesCache.rates;
  }

  try {
    const symbols = FRANKFURTER_CURRENCIES.filter((c) => c !== "USD").join(",");
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${symbols}`
    );
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json();
    ratesCache = {
      rates: { USD: 1, ...(data.rates ?? {}) },
      fetchedAt: Date.now(),
    };
    return ratesCache.rates;
  } catch (err) {
    console.warn("FX rates fetch failed, using fallbacks:", err.message);
    return {
      USD: 1,
      SEK: 10.5,
      EUR: 0.92,
      GBP: 0.79,
      CAD: 1.36,
      AUD: 1.53,
      NOK: 10.8,
      DKK: 6.9,
      CHF: 0.88,
      PLN: 4.0,
      ...ratesCache.rates,
    };
  }
}

export async function buildStoreConfig(req) {
  const country = detectCountry(req);
  const currency = currencyForCountry(country);
  const rates = await fetchUsdRates();
  const rate = rates[currency] ?? 1;
  const locale = localeForCurrency(currency, country);

  return {
    country,
    currency,
    locale,
    /** Multiply (USD base + markup) by this to get local currency amount. */
    rate,
    priceAddOnUsd: PRICE_ADD_ON_USD,
    baseCurrency: "USD",
  };
}
