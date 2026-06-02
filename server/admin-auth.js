import crypto from "crypto";

const ADMIN_USER = process.env.ADMIN_USER || "BabyHugadmin.se";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin0";
const SESSION_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, { user: string, exp: number }>} */
const sessions = new Map();

export function getAdminCredentials() {
  return { username: ADMIN_USER };
}

export function verifyCredentials(username, password) {
  return username === ADMIN_USER && password === ADMIN_PASSWORD;
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
