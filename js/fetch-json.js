import { apiUrl } from "./config.js";

/** Fetch JSON with timeout so the UI never hangs forever. */
export async function fetchJson(path, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal,
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      const err = new Error("Invalid JSON response");
      err.status = res.status;
      err.body = raw;
      throw err;
    }
    return { res, data, raw };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out — check that npm run dev is running.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
