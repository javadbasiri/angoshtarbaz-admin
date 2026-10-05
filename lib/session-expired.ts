"use client";

export const SESSION_EXPIRED_EVENT = "angoshtarbaz-admin-session-expired";

/** Ask the shell to clear the httpOnly cookie and go to `/login`. */
export function signalSessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
