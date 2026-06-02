const TOKEN_KEY = "bh_admin_token";

const loginEl = document.getElementById("admin-login");
const appEl = document.getElementById("admin-app");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const gridEl = document.getElementById("admin-grid");
const countEl = document.getElementById("product-count");
const loadingEl = document.getElementById("admin-loading");
const logoutBtn = document.getElementById("logout-btn");

/** @type {Array<{pid:string,sku:string,name:string,image:string,cjPriceDisplay:string,priceDisplay:string,category:string,editMode:null|'price'|'cat',saved:boolean,pendingCat?:string}>} */
let state = [];
let categories = [];
let overridesStorage = "file";

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { error: raw };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function showLogin() {
  loginEl.hidden = false;
  appEl.hidden = true;
}

function showApp() {
  loginEl.hidden = true;
  appEl.hidden = false;
}

function updateStorageHint() {
  const hint = document.getElementById("admin-storage-hint");
  if (!hint) return;
  if (overridesStorage === "firestore") {
    hint.hidden = false;
    hint.textContent = "Product edits save to Firebase Firestore";
  } else {
    hint.hidden = false;
    hint.textContent = "Product edits save to data/product-overrides.json (set FIREBASE_SERVICE_ACCOUNT_JSON for Firestore)";
  }
}

async function verifySession() {
  if (!getToken()) return false;
  try {
    const data = await api("/api/admin/me");
    overridesStorage = data.overridesStorage ?? "file";
    updateStorageHint();
    return true;
  } catch {
    setToken(null);
    return false;
  }
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const fd = new FormData(loginForm);
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");

  try {
    const data = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    showApp();
    await loadProducts();
  } catch (err) {
    loginError.textContent =
      err.status === 401 ? "Invalid username or password." : err.message;
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  setToken(null);
  state = [];
  showLogin();
});

async function saveProduct(i, patch, saveBtn) {
  const p = state[i];
  if (!p?.pid) {
    alert("Missing product id — refresh the page and try again.");
    return;
  }
  if (saveBtn) saveBtn.disabled = true;

  try {
    const body = { ...patch };
    if (Array.isArray(patch.categories) && patch.categories.length) {
      body.category = patch.categories[0];
    }

    const data = await api(
      `/api/admin/products/${encodeURIComponent(p.pid)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );

    if (patch.categories !== undefined) {
      const saved =
        data?.override?.categories ??
        (data?.override?.category ? [data.override.category] : patch.categories);
      p.categories = saved;
      p.category = saved[0];
      p.pendingCategories = undefined;
    }
    if (patch.priceDisplay !== undefined) p.priceDisplay = patch.priceDisplay;
    if (patch.title !== undefined) {
      p.name = data?.override?.title ?? patch.title;
    }
    p.editMode = null;
    p.saved = true;
    render();
    setTimeout(() => {
      p.saved = false;
      render();
    }, 1800);
  } catch (err) {
    const msg = err.message || "Could not save";
    if (msg.includes("Nothing to update")) {
      alert(
        "Save failed — restart the server (stop npm run dev, then run it again) and hard-refresh this page."
      );
    } else {
      alert(msg);
    }
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Raw CJ catalog price (USD) from sellPrice field. */
function formatCjPriceDisplay(sellPrice) {
  if (sellPrice == null || sellPrice === "") return "";
  const s = String(sellPrice).trim();
  if (!s) return "";
  if (s.includes("-")) {
    const [low, high] = s.split("-").map((part) => part.trim());
    if (low && high) return `$${low}–$${high}`;
    if (low) return `$${low}`;
  }
  return `$${s}`;
}

function normalizeAdminProduct(p) {
  const cjPriceDisplay =
    p.cjPriceDisplay || formatCjPriceDisplay(p.sellPrice);
  const categories = Array.isArray(p.categories)
    ? p.categories
    : p.category
      ? [p.category]
      : [];
  return { ...p, cjPriceDisplay, categories };
}

function categoryBadgesHtml(categories) {
  const cats = categories?.length ? categories : ["—"];
  return `<span class="admin-cat-badges">${cats
    .map((c) => `<span class="admin-cat-badge">${escapeHtml(c)}</span>`)
    .join("")}</span>`;
}

function selectedCategories(p) {
  if (p.editMode === "cat") {
    return p.pendingCategories ?? p.categories ?? [];
  }
  return p.categories ?? [];
}

function priceFieldHtml(p, i) {
  const active = p.editMode === "price" ? " is-active" : "";
  const cjText = p.cjPriceDisplay || formatCjPriceDisplay(p.sellPrice);
  const cj = cjText
    ? `<span class="admin-price-cj" title="CJ Dropshipping price">${escapeHtml(cjText)}</span>`
    : "";
  const store = `<span class="admin-price-store">${escapeHtml(p.priceDisplay)}</span>`;
  return `<span class="admin-field-value${active}" data-edit="${i}" data-mode="price"><span class="admin-price-wrap">${cj}${store}</span></span>`;
}

function render() {
  if (!gridEl) return;

  gridEl.innerHTML = state
    .map((p, i) => {
      const img = p.image
        ? `<img class="admin-card-img" src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async" />`
        : `<div class="admin-card-img-placeholder" aria-hidden="true">No image</div>`;

      let editHTML = "";
      if (p.editMode === "price") {
        editHTML = `
          <div class="admin-edit-area">
            <input class="admin-price-input" id="pi-${escapeHtml(p.pid)}" value="${escapeHtml(p.priceDisplay)}" />
            <div class="admin-btn-row">
              <button type="button" class="admin-btn-cancel" data-cancel="${i}">Cancel</button>
              <button type="button" class="admin-btn-save" data-save-pid="${escapeHtml(p.pid)}" data-save-price="${i}">Save</button>
            </div>
          </div>`;
      } else if (p.editMode === "title") {
        editHTML = `
          <div class="admin-edit-area">
            <input class="admin-title-input" id="title-${escapeHtml(p.pid)}" value="${escapeHtml(p.name)}" maxlength="200" />
            <div class="admin-btn-row">
              <button type="button" class="admin-btn-cancel" data-cancel="${i}">Cancel</button>
              <button type="button" class="admin-btn-save" data-save-title="${i}">Save</button>
            </div>
          </div>`;
      } else if (p.editMode === "cat") {
        const selected = selectedCategories(p);
        const pills = categories
          .map(
            (c) =>
              `<button type="button" class="admin-cat-pill${selected.includes(c) ? " is-selected" : ""}" data-cat-pick="${i}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
          )
          .join("");
        editHTML = `
          <div class="admin-edit-area">
            <p class="admin-cat-hint">Select one or more categories</p>
            <div class="admin-cat-pills">${pills}</div>
            <div class="admin-btn-row">
              <button type="button" class="admin-btn-cancel" data-cancel="${i}">Cancel</button>
              <button type="button" class="admin-btn-save" data-save-pid="${escapeHtml(p.pid)}" data-save-cat="${i}">Save</button>
            </div>
          </div>`;
      }

      return `
        <article class="admin-card" data-index="${i}">
          ${img}
          <div class="admin-card-body">
            <p class="admin-sku">${escapeHtml(p.sku)}</p>
            <div class="admin-field-row admin-field-row--title">
              <span class="admin-field-label">Title</span>
              <span class="admin-field-value admin-field-value--title${p.editMode === "title" ? " is-active" : ""}" data-edit="${i}" data-mode="title" title="Click to edit">${escapeHtml(p.name)}</span>
            </div>
            <div class="admin-field-row">
              <span class="admin-field-label">Price</span>
              ${priceFieldHtml(p, i)}
            </div>
            <div class="admin-field-row">
              <span class="admin-field-label">Category</span>
              <span class="admin-field-value admin-field-value--categories${p.editMode === "cat" ? " is-active" : ""}" data-edit="${i}" data-mode="cat">${categoryBadgesHtml(p.categories)}</span>
            </div>
            ${editHTML}
            ${p.saved ? `<div class="admin-saved-flash">Saved</div>` : ""}
          </div>
        </article>`;
    })
    .join("");

  gridEl.querySelectorAll("[data-edit]").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.edit);
      const mode = el.dataset.mode;
      openEdit(i, mode);
    });
  });

  gridEl.querySelectorAll("[data-cancel]").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.cancel);
      state[i].editMode = null;
      state[i].pendingCategories = undefined;
      render();
    });
  });

  gridEl.querySelectorAll("[data-cat-pick]").forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.catPick);
      const cat = el.dataset.cat;
      const list = [...selectedCategories(state[i])];
      const at = list.indexOf(cat);
      if (at >= 0) list.splice(at, 1);
      else list.push(cat);
      state[i].pendingCategories = list;
      render();
    });
  });

  gridEl.querySelectorAll("[data-save-title]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const i = Number(el.dataset.saveTitle);
      const inp = document.getElementById(`title-${state[i].pid}`);
      const title = inp?.value?.trim() ?? "";
      if (!title) {
        alert("Title cannot be empty.");
        return;
      }
      await saveProduct(i, { title }, el);
    });
  });

  gridEl.querySelectorAll("[data-save-price]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const i = Number(el.dataset.savePrice);
      const inp = document.getElementById(`pi-${state[i].pid}`);
      const priceDisplay = inp?.value?.trim() ?? "";
      await saveProduct(i, { priceDisplay }, el);
    });
  });

  gridEl.querySelectorAll("[data-save-cat]").forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const i = Number(el.dataset.saveCat);
      const cats = selectedCategories(state[i]);
      if (!cats.length) {
        alert("Select at least one category.");
        return;
      }
      await saveProduct(i, { categories: cats }, el);
    });
  });
}

function openEdit(i, mode) {
  state = state.map((p, idx) => ({
    ...p,
    editMode: idx === i ? (p.editMode === mode ? null : mode) : null,
    saved: false,
    pendingCategories: idx === i ? [...(p.categories ?? [])] : undefined,
  }));
  render();
  if (mode === "price") {
    const inp = document.getElementById(`pi-${state[i].pid}`);
    inp?.focus();
    inp?.select();
  }
  if (mode === "title") {
    const inp = document.getElementById(`title-${state[i].pid}`);
    inp?.focus();
    inp?.select();
  }
}

async function loadProducts() {
  loadingEl.hidden = false;
  gridEl.hidden = true;
  countEl.textContent = "Loading…";

  try {
    const data = await api("/api/admin/products");
    categories = data.categories ?? [];
    state = (data.products ?? []).map((p) => ({
      ...normalizeAdminProduct(p),
      editMode: null,
      saved: false,
    }));
    countEl.textContent = `${state.length} product${state.length === 1 ? "" : "s"}`;
    loadingEl.hidden = true;
    gridEl.hidden = false;
    render();
  } catch (err) {
    loadingEl.textContent = err.message || "Could not load products.";
    if (err.status === 401) {
      setToken(null);
      showLogin();
    }
  }
}

async function init() {
  if (await verifySession()) {
    showApp();
    await loadProducts();
  } else {
    showLogin();
  }
}

init();
