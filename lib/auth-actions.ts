"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import {
  backendFetch,
  extractToken,
  extractUser,
  isAdminRole,
  messageFromBody,
} from "@/lib/backend";
import { AUTH_LOGIN_PATH, env } from "@/lib/env";
import { loginFailureMessage, unreachableBackendMessage } from "@/lib/login-response";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookie";
import type { AdminUser } from "@/types/auth";

async function callerOrigin(): Promise<string | null> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim() || headerList.get("host");
  if (!host) return null;
  const forwarded = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return `${forwarded || "http"}://${host}`;
}

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<AdminUser>> {
  const email = input.email?.trim() ?? "";
  const password = input.password ?? "";
  if (!email || !password) {
    return actionFail(400, "ایمیل و رمز عبور الزامی است.");
  }

  const url = `${env.apiUrl}${AUTH_LOGIN_PATH}`;
  const adminOrigin = await callerOrigin();

  try {
    const { response, body } = await backendFetch(AUTH_LOGIN_PATH, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const failure = loginFailureMessage({
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      url,
      body,
      apiOrigin: env.apiUrl,
      adminOrigin,
      password,
    });

    if (!response.ok) {
      return actionFail(
        response.status || 401,
        failure ?? messageFromBody(body, "ورود ناموفق بود."),
      );
    }

    const token = extractToken(body);
    if (!token) {
      return actionFail(502, failure ?? "پاسخ ورود توکن JWT ندارد.");
    }

    const user = extractUser(body, email) ?? { email, role: "admin" };
    if (!isAdminRole(user.role)) {
      return actionFail(403, "این حساب دسترسی ادمین ندارد.");
    }

    await setSessionCookie(token);
    return actionOk(user);
  } catch {
    return actionFail(502, unreachableBackendMessage(url));
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
