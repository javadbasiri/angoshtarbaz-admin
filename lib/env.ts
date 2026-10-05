const DEFAULT_API_URL = "http://localhost:3001";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

/**
 * Backend origin for angoshtarbaz-backend.
 * Prefers `NEXT_PUBLIC_API_URL` (ANG-A0 contract) and still accepts the
 * scaffold alias `NEXT_PUBLIC_API_BASE_URL`.
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

/** Nest current-user. One path — no `/users/me` or `/admin/me` alternates. */
export const AUTH_ME_PATH = "/auth/me";
