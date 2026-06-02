import crypto from "crypto";

const ADMIN_USER = process.env.ADMIN_USER || "BabyHugadmin.se";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin0";
const SESSION_MS = 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

if (isProd && (!process.env.ADMIN_PASSWORD || ADMIN_PASSWORD === "Admin0")) {
  console.error(
    "[Baby Hug] SECURITY: Set ADMIN_USER and a strong ADMIN_PASSWORD in production .env"
  );
}

/** @type {Map<string, { user: string, exp: number }>} */
const sessions = new Map();

/** @type {Map<string, { count: number, resetAt: number }>} */
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

export function getAdminCredentials() {
  return { username: ADMIN_USER };
}

export function verifyCredentials(username, password) {
  const entered = String(username ?? "").trim().toLowerCase();
  const expected = String(ADMIN_USER ?? "").trim().toLowerCase();
  return entered === expected && password === ADMIN_PASSWORD;
}

export function isLoginRateLimited(clientKey) {
  const key = clientKey || "unknown";
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

export function recordFailedLogin(clientKey) {
  const key = clientKey || "unknown";
  const now = Date.now();
  let entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(key, entry);
  }
  entry.count += 1;
}

export function clearLoginAttempts(clientKey) {
  if (clientKey) loginAttempts.delete(clientKey);
}

export function createSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { user: username, exp: Date.now() + SESSION_MS });
  return token;
}

export function validateToken(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.exp) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

export function destroyToken(token) {
  sessions.delete(token);
}

export function bearerToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export function requireAdmin(req, res, next) {
  const user = validateToken(bearerToken(req));
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.adminUser = user;
  next();
}
