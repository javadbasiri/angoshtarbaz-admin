"use server";

import { clearSessionCookie } from "@/lib/session-cookie";

/**
 * Drop the httpOnly admin cookie.
 * Navigation to `/login` stays on the client: `redirect()` from a `useEffect`
 * server-action call surfaces as an unhandled rejection in Next.js.
 */
export async function expireAdminSession() {
  await clearSessionCookie();
}
