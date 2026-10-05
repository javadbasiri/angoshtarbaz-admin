const DEFAULT_API_URL = "http://localhost:3000";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

/** Blank env values are unset so `??` can reach the next candidate or the default. */
const pick = (v: string | undefined) => v?.trim() || undefined;

/**
 * Nest origin for angoshtarbaz-backend (Nest listens on PORT || 3000).
 * Prefers `NEXT_PUBLIC_API_URL` (ANG-A0 contract) and still accepts the
 * scaffold alias `NEXT_PUBLIC_API_BASE_URL`. Inlined at build time.
 * Empty or whitespace-only values are ignored (a blank line copied from
 * `.env.example` must not turn every fetch into a relative URL).
 */
/**
 * ANG-A6 folder UI. Off unless the value is `1` or `true` (after trim).
 * Default off keeps the flat ANG-A3 gallery on production/main.
 */
export function galleryFoldersEnabled(value: string | undefined): boolean {
  const picked = pick(value)?.toLowerCase();
  return picked === "1" || picked === "true";
}

export const env = {
  apiUrl: trimSlash(
    pick(process.env.NEXT_PUBLIC_API_URL) ??
      pick(process.env.NEXT_PUBLIC_API_BASE_URL) ??
      DEFAULT_API_URL,
  ),
  /** Inlined at build time. Restart `next dev` or rebuild after changing it. */
  galleryFolders: galleryFoldersEnabled(process.env.NEXT_PUBLIC_GALLERY_FOLDERS),
} as const;

/** Nest admin login. One path — no alternate sign-in routes. */
export const AUTH_LOGIN_PATH = "/auth/login";

/** Nest current admin. There is no `/auth/me`. */
export const AUTH_PROFILE_PATH = "/auth/profile";
