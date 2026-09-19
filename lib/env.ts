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
  loginPath: process.env.API_LOGIN_PATH?.replace(/\/$/, "") || "/auth/login",
} as const;
