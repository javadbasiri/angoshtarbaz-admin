import { backendFetch, extractUser, getSessionToken } from "@/lib/backend";
import { AUTH_ME_PATH } from "@/lib/env";
import { isNextRedirect } from "@/lib/redirect-error";
import type { AdminUser } from "@/types/auth";

export type CurrentUserState =
  | { status: "anonymous" }
  | { status: "unauthorized" }
  | { status: "ready"; user: AdminUser | null };

/**
 * Current admin for the shell. `GET /auth/me` only.
 * A missing endpoint leaves the session in place and the header uses its default label.
 * 401 does not clear the cookie here — cookie writes belong in a Server Action.
 * The shell renders `ExpireSession`, which clears it and redirects to `/login`.
 */
export async function loadCurrentUser(): Promise<CurrentUserState> {
  const token = await getSessionToken();
  if (!token) return { status: "anonymous" };

  try {
    const { response, body } = await backendFetch(AUTH_ME_PATH, { method: "GET" }, token);
    if (response.status === 401) return { status: "unauthorized" };
    if (!response.ok) return { status: "ready", user: null };
    return { status: "ready", user: extractUser(body) };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { status: "ready", user: null };
  }
}
