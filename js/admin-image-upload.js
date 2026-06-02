/**
 * Admin product image upload → Firebase Storage (product-images/).
 * Requires Firebase Auth + users/{uid}.role === "admin" in Firestore.
 */
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase-config.js";

const els = {
  panel: document.getElementById("admin-upload-panel"),
  firebaseAuth: document.getElementById("admin-firebase-auth"),
  firebaseStatus: document.getElementById("admin-firebase-status"),
  firebaseForm: document.getElementById("admin-firebase-form"),
  firebaseEmail: document.getElementById("admin-firebase-email"),
  firebasePass: document.getElementById("admin-firebase-pass"),
  firebaseSignOut: document.getElementById("admin-firebase-signout"),
  firebaseError: document.getElementById("admin-firebase-error"),
  file: document.getElementById("admin-image-file"),
  uploadBtn: document.getElementById("admin-image-upload-btn"),
  uploadError: document.getElementById("admin-upload-error"),
  uploadStatus: document.getElementById("admin-upload-status"),
  preview: document.getElementById("admin-image-preview"),
  previewImg: document.getElementById("admin-image-preview-img"),
  urlOut: document.getElementById("admin-image-url"),
};

function setFirebaseError(msg) {
  if (els.firebaseError) els.firebaseError.textContent = msg || "";
}

function setUploadError(msg) {
  if (els.uploadError) els.uploadError.textContent = msg || "";
}

function setUploadStatus(msg) {
  if (els.uploadStatus) els.uploadStatus.textContent = msg || "";
}

async function isFirebaseAdmin(user) {
  if (!user) return false;
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() && snap.data()?.role === "admin";
}

function updateFirebaseUi(user, isAdmin) {
  if (!els.firebaseStatus) return;

  if (user && isAdmin) {
    els.firebaseStatus.textContent = `Signed in as ${user.email} (admin)`;
    if (els.firebaseAuth) els.firebaseAuth.hidden = true;
    if (els.firebaseSignOut) els.firebaseSignOut.hidden = false;
    if (els.uploadBtn) els.uploadBtn.disabled = false;
  } else if (user) {
    els.firebaseStatus.textContent = `${user.email} — not an admin. Uploads blocked.`;
    if (els.firebaseAuth) els.firebaseAuth.hidden = true;
    if (els.firebaseSignOut) els.firebaseSignOut.hidden = false;
    if (els.uploadBtn) els.uploadBtn.disabled = true;
  } else {
    els.firebaseStatus.textContent = "Sign in with Firebase to upload images.";
    if (els.firebaseAuth) els.firebaseAuth.hidden = false;
    if (els.firebaseSignOut) els.firebaseSignOut.hidden = true;
    if (els.uploadBtn) els.uploadBtn.disabled = true;
  }
}

async function refreshFirebaseAuthUi() {
  const user = auth.currentUser;
  const admin = user ? await isFirebaseAdmin(user) : false;
  updateFirebaseUi(user, admin);
}

async function requireFirebaseAdmin() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Sign in with Firebase before uploading.");
  }
  if (!(await isFirebaseAdmin(user))) {
    throw new Error("Your Firebase account does not have admin role.");
  }
  return user;
}

function safeFileName(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadProductImage(file) {
  await requireFirebaseAdmin();

  const storageRef = ref(
    storage,
    `product-images/${Date.now()}-${safeFileName(file.name)}`
  );

  setUploadStatus("Uploading…");
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });

  const downloadUrl = await getDownloadURL(snapshot.ref);
  console.log("Uploaded image URL:", downloadUrl);
  return downloadUrl;
}

function showPreview(url) {
  if (!els.preview || !els.previewImg || !els.urlOut) return;
  els.preview.hidden = false;
  els.previewImg.src = url;
  els.urlOut.textContent = url;
  els.urlOut.href = url;
}

async function handleUpload() {
  setUploadError("");
  setUploadStatus("");

  const file = els.file?.files?.[0];
  if (!file) {
    setUploadError("Choose an image file first.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    setUploadError("Please select an image file (JPEG, PNG, WebP, etc.).");
    return;
  }

  const maxMb = 10;
  if (file.size > maxMb * 1024 * 1024) {
    setUploadError(`Image must be under ${maxMb} MB.`);
    return;
  }

  els.uploadBtn.disabled = true;

  try {
    const url = await uploadProductImage(file);
    setUploadStatus("Upload complete. URL logged to the browser console.");
    showPreview(url);
  } catch (err) {
    console.error("Upload failed:", err);
    setUploadError(err?.message || "Upload failed.");
  } finally {
    await refreshFirebaseAuthUi();
  }
}

export function initAdminImageUpload() {
  if (!els.panel) return;

  onAuthStateChanged(auth, () => {
    refreshFirebaseAuthUi().catch(console.error);
  });

  els.firebaseForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFirebaseError("");
    const email = els.firebaseEmail?.value.trim() ?? "";
    const password = els.firebasePass?.value ?? "";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await refreshFirebaseAuthUi();
    } catch (err) {
      setFirebaseError(err?.message || "Firebase sign-in failed.");
    }
  });

  els.firebaseSignOut?.addEventListener("click", async () => {
    setFirebaseError("");
    try {
      await signOut(auth);
      await refreshFirebaseAuthUi();
    } catch (err) {
      setFirebaseError(err?.message || "Sign-out failed.");
    }
  });

  els.uploadBtn?.addEventListener("click", handleUpload);

  refreshFirebaseAuthUi().catch(console.error);
}
