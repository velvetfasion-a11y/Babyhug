/**
 * Single profile icon in the header — links to login or profile based on Firebase Auth.
 */
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase-config.js";

const PROFILE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  <circle cx="12" cy="8" r="4" />
  <path d="M5 20c0-4 3.5-6 7-6s7 2 7 6" />
</svg>`;

function applyNavLink(el, user) {
  if (!el) return;
  if (user) {
    el.href = "profile.html";
    el.setAttribute("aria-label", "Your profile");
    el.title = "Your profile";
    if (el.id === "nav-profile-mobile") el.textContent = "Your profile";
    el.classList.add("is-signed-in");
  } else {
    el.href = "login.html";
    el.setAttribute("aria-label", "Sign in");
    el.title = "Sign in";
    if (el.id === "nav-profile-mobile") el.textContent = "Sign in";
    el.classList.remove("is-signed-in");
  }
}

export function initAuthNav() {
  const btn = document.getElementById("nav-profile-btn");
  const mobile = document.getElementById("nav-profile-mobile");
  if ((!btn && !mobile) || !auth) return;

  if (btn && !btn.querySelector("svg")) {
    btn.innerHTML = PROFILE_ICON;
  }

  onAuthStateChanged(auth, (user) => {
    applyNavLink(btn, user);
    applyNavLink(mobile, user);
  });
}
