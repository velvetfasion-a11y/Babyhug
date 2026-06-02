// Firebase config is loaded at runtime from the server (/api/firebase-config)
// Real keys live only in Render environment variables — never in this file or GitHub.
export async function loadFirebaseConfig() {
  const res = await fetch("/api/firebase-config", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load Firebase config from server");
  }
  const config = await res.json();
  if (!config || typeof config !== "object" || !config.apiKey) {
    throw new Error("Invalid Firebase config received from server");
  }
  return config;
}
