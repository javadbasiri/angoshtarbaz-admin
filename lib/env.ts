const DEFAULT_API_URL = "http://localhost:3000";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

/**
 * Backend origin for angoshtarbaz-backend (Nest listens on PORT || 3000).
 * Prefers `NEXT_PUBLIC_API_URL` (ANG-A0 contract) and still accepts the
 * scaffold alias `NEXT_PUBLIC_API_BASE_URL`. Inlined at build time.
 */
export const env = {
  apiUrl: trimSlash(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      DEFAULT_API_URL,
  ),
} as const;

/** Nest admin login. One path — no alternate sign-in routes. */
export const AUTH_LOGIN_PATH = "/auth/login";

/** Nest current admin. There is no `/auth/me`. */
export const AUTH_PROFILE_PATH = "/auth/profile";
