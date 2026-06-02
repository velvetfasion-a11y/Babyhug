# Baby Hug — setup checklist

## What the code does now

| Feature | How it works |
|---------|----------------|
| **Storefront** | Node server + `CJ_API_KEY` |
| **Admin login** | Server username/password (`ADMIN_USER` / `ADMIN_PASSWORD`) — **not** Google |
| **Admin product edits** | Firestore `admin/productOverrides` when `FIREBASE_SERVICE_ACCOUNT_JSON` is set; else `data/product-overrides.json` |
| **Profile** | Google sign-in; wishlist + cart sync to `users/{uid}/wishlist` and `users/{uid}/cart` |
| **Guests** | Wishlist/cart in localStorage until they sign in (then merged to cloud) |

---

## Where `NODE_ENV=production` is set

| Location | Role |
|----------|------|
| **`render.yaml`** | Sets `NODE_ENV=production` on Render deploy |
| **`server.js`** | Reads `process.env.NODE_ENV === "production"` (trust proxy, logging) |
| **`server/admin-auth.js`** | Warns if default admin password is used in production |
| **`.env.example`** | Documents `NODE_ENV=development` for local dev |

Locally, `NODE_ENV` is usually **unset** or `development` unless you set it in `.env`.

---

## Firebase Console (customers)

1. [Firebase Console](https://console.firebase.google.com/) → **babyhug-bb69a**
2. **Authentication → Sign-in method** → enable **Email/Password** (Email + Password)
3. **Authentication → Sign-in method** → enable **Google**
3. **Authorized domains**: `localhost`, `babyhug.se`, `www.babyhug.se`, your Render host
4. **Firestore** → create database → **Rules** → paste `firestore.rules` → **Publish**
5. **Project settings → Web app** → copy config to `js/firebase-config.js`

---

## Firebase Admin (product overrides on server)

Admin **login** stays username/password. **Storage** uses Firestore when the server has a service account.

1. Firebase Console → **Project settings → Service accounts**
2. **Generate new private key** → download JSON
3. On Render (or `.env` locally), set **one** of:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = entire JSON file as a **single line**
   - `GOOGLE_APPLICATION_CREDENTIALS` = path to the JSON file on disk

4. Restart the server. Logs should show:
   - `[Overrides] Loaded N product override(s) from Firestore`, or
   - `[Overrides] Seeded Firestore from file`

5. In admin UI after login: *"Product edits save to Firebase Firestore"*

Without service account JSON, edits still work via `data/product-overrides.json`.

---

## Server environment variables

```env
CJ_API_KEY=your_cj_key
ADMIN_USER=your_admin_username
ADMIN_PASSWORD=strong_password
NODE_ENV=production
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## Quick tests

1. **Cart sync**: Add items as guest → profile → Sign in with Google → cart appears on profile; open shop on another browser after sign-in → same cart (after sync).
2. **Admin Firestore**: Set service account → edit product in admin → check Firebase Console → Firestore → `admin` → `productOverrides`.
3. **Admin file fallback**: Remove service account env → restart → admin shows *Local file* hint.

---

## Profile blank or old design on babyhug.se

1. **Redeploy** the latest code from GitHub to Render (Manual Deploy → Deploy latest commit).
2. Ensure **`js/firebase-config.js`** is in the repo (config only, no `import from "firebase/..."`). An old broken file breaks profile JavaScript.
3. After deploy, hard-refresh: **Cmd+Shift+R** (Mac) or clear cache for babyhug.se.
4. Open **https://babyhug.se/profile.html** (person icon in header).

---

## Not implemented yet

- Checkout / payments
- Other providers (Apple, Facebook, etc.)
- Google login for admin (by design — server login only)
