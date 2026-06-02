/**
 * Sign out and clear cached auth state across the app.
 */
import { signOut } from "firebase/auth";
import { auth } from "./firebase-config.js";

export async function signOutUser() {
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }

  await signOut(auth);
  await auth.authStateReady();

  if (auth.currentUser) {
    throw new Error("Sign-out did not complete. Please try again.");
  }

  return true;
}
