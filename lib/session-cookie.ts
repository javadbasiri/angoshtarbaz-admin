import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth-constants";

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "", sessionCookieOptions(0));
}
