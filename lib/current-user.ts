import { backendFetch, extractUser, getSessionToken } from "@/lib/backend";
import { AUTH_ME_PATH } from "@/lib/env";
import { isNextRedirect } from "@/lib/redirect-error";
import { clearSessionCookie } from "@/lib/session-cookie";
import type { AdminUser } from "@/types/auth";
import { redirect } from "next/navigation";

/**
 * Current admin for the shell. `GET /auth/me` only.
 * A missing endpoint leaves the session in place and the header uses its default label.
 * 401 clears the httpOnly cookie and sends the browser to `/login`.
 */
export async function loadCurrentUser(): Promise<AdminUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const { response, body } = await backendFetch(AUTH_ME_PATH, { method: "GET" }, token);
    if (response.status === 401) {
      await clearSessionCookie();
      redirect("/login");
    }
    if (!response.ok) return null;
    return extractUser(body);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return null;
  }
}
