/**
 * API base URL for fetch calls.
 *
 * Local:  ""  →  http://localhost:3000/api/products  (npm run dev)
 *
 * Production — pick ONE setup:
 *
 * A) Full site on Node (recommended): deploy server.js to your host, keep "".
 *    babyhug.se must run `node server.js` (not static-only hosting).
 *
 * B) Static site + API elsewhere: set API_BASE to your backend URL, e.g.
 *    "https://api.babyhug.se" or "https://your-app.onrender.com"
 */
function isLocalHost() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function isBabyHugSite() {
  const h = window.location.hostname;
  return h === "babyhug.se" || h === "www.babyhug.se";
}

export const API_BASE = (() => {
  if (isLocalHost()) return "";

  // Same-origin: Express serves HTML + /api on babyhug.se
  if (isBabyHugSite()) return "";

  return "";
})();

export function apiUrl(path) {
  const base = API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
