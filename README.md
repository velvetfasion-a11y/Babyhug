# Baby Hug — Storefront

Static storefront with a small Node.js API for CJ Dropshipping products.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Store pages:** `/` · `/shop.html` · `/product.html` · `/profile.html` · `/login.html`  
**Staff:** `/admin.html` (not linked on the public menu by default — use this URL)

After deploying, hard-refresh the browser (or use a private window) so you do not see an old cached header.

Set your CJ key in `.env`:

```
CJ_API_KEY=your_key_here
```

---

## Why babyhug.se shows “Could not load products”

**localhost works** because `npm run dev` runs `server.js`, which:

- Serves your HTML/CSS/JS
- Exposes `/api/products` and `/api/product` (your API key stays on the server)

**babyhug.se fails** if you only uploaded HTML files to “static” hosting. There is no server there, so `/api/products` returns 404.

### Fix (choose one)

#### Option A — Run Node on babyhug.se (best)

Deploy the **whole project** to [Render](https://render.com) (or similar):

1. Push the repo to GitHub.
2. **New → Web Service** → connect the repo.
3. **Build command:** `npm install`
4. **Start command:** `npm start` (runs `node server.js`)
5. **Environment variables** (Render dashboard):
   - `CJ_API_KEY` = your CJ API key
   - `NODE_ENV` = `production`
6. Point **babyhug.se** DNS to Render (custom domain in Render settings).

`server.js` listens on `process.env.PORT` and `0.0.0.0` (required by Render).  
Health check: `GET /health`

#### Option B — Static site + API on another URL

1. Deploy `server.js` to e.g. `https://babyhug-api.onrender.com`
2. In `js/config.js`, set `API_BASE` for production:

   ```javascript
   if (isBabyHugSite()) return "https://babyhug-api.onrender.com";
   ```

3. Keep uploading HTML/CSS/JS to babyhug.se as you do now.

CORS for babyhug.se is already enabled in `server.js`.

---

## Google sign-in works on localhost but not on babyhug.se

Firebase allows **localhost** by default. Your live domain must be added manually.

### 1. Firebase — authorized domains

1. [Firebase Console](https://console.firebase.google.com/) → project **babyhug-bb69a**
2. **Authentication** → **Settings** → **Authorized domains**
3. **Add domain** for each hostname you use:
   - `babyhug.se`
   - `www.babyhug.se` (if users can open `https://www.babyhug.se`)

Wait a minute, then try sign-in again. A wrong or missing domain shows `auth/unauthorized-domain` in the browser console.

### 2. Google Cloud — OAuth Web client

1. [Google Cloud Console](https://console.cloud.google.com/) → same project as Firebase
2. **APIs & Services** → **Credentials** → your **Web client** OAuth 2.0 client
3. **Authorized JavaScript origins** — add:
   - `https://babyhug.se`
   - `https://www.babyhug.se`
4. **Authorized redirect URIs** — must include Firebase’s handler:
   - `https://babyhug-bb69a.firebaseapp.com/__/auth/handler`

In Firebase: **Authentication** → **Sign-in method** → **Google** → enable, and paste the Web client ID + secret there if prompted (never put the secret in this repo).

### 3. Production file

`js/firebase-config.js` is gitignored but must exist on the server (Render: upload or generate at deploy). If it is missing, the login page shows a Firebase load error.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start site + API on port 3000 |
| `node fetch-products.js` | Test CJ API from terminal |
