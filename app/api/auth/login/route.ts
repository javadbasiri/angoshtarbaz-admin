import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth-constants";
import { backendFetch, extractToken, extractUser, isAdminRole } from "@/lib/backend";
import { env } from "@/lib/env";

const LOGIN_PATHS = Array.from(
  new Set([env.loginPath, "/auth/login", "/auth/signin", "/login", "/auth/admin/login"]),
);

export async function POST(request: Request) {
  let payload: { email?: string; password?: string };
  try {
    payload = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ message: "ایمیل و رمز عبور الزامی است." }, { status: 400 });
  }

  let lastStatus = 502;
  let lastBody: unknown = { message: "اتصال به بک‌اند برقرار نشد." };

  for (const path of LOGIN_PATHS) {
    try {
      const { response, body } = await backendFetch(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      lastStatus = response.status;
      lastBody = body;

      if (!response.ok) {
        if (response.status === 404) continue;
        break;
      }

      const token = extractToken(body);
      if (!token) {
        lastStatus = 502;
        lastBody = { message: "پاسخ ورود توکن JWT ندارد." };
        continue;
      }

      const user = extractUser(body, email);
      if (user && !isAdminRole(user.role)) {
        return NextResponse.json(
          { message: "این حساب دسترسی ادمین ندارد." },
          { status: 403 },
        );
      }

      const store = await cookies();
      store.set(ADMIN_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      });

      return NextResponse.json({
        authenticated: true,
        user: user ?? { email, role: "admin" },
      });
    } catch {
      lastStatus = 502;
      lastBody = {
        message: `بک‌اند در ${env.apiUrl} در دسترس نیست.`,
      };
    }
  }

  const message =
    lastBody && typeof lastBody === "object" && "message" in lastBody
      ? String((lastBody as { message: unknown }).message)
      : "ورود ناموفق بود.";

  return NextResponse.json({ message, details: lastBody }, { status: lastStatus || 401 });
}
