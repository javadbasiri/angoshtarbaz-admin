import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";

const PUBLIC_PATHS = new Set(["/login"]);

function isPublic(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token && !isPublic(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // Document GET /login bounces to the app when a session already exists.
  // A POST (including a Server Action, which sends `next-action`) must reach
  // the action — a 307 would drop a submit from a stale login tab.
  if (
    token &&
    pathname === "/login" &&
    request.method !== "POST" &&
    !request.headers.has("next-action")
  ) {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(next || "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
