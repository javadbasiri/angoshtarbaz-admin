"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import {
  backendFetch,
  extractToken,
  extractUser,
  isAdminRole,
  messageFromBody,
} from "@/lib/backend";
import { AUTH_LOGIN_PATH, env } from "@/lib/env";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookie";
import type { AdminUser } from "@/types/auth";
import { redirect } from "next/navigation";

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<AdminUser>> {
  const email = input.email?.trim() ?? "";
  const password = input.password ?? "";
  if (!email || !password) {
    return actionFail(400, "ایمیل و رمز عبور الزامی است.");
  }

  try {
    const { response, body } = await backendFetch(AUTH_LOGIN_PATH, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return actionFail(response.status || 401, messageFromBody(body, "ورود ناموفق بود."));
    }

    const token = extractToken(body);
    if (!token) {
      return actionFail(502, "پاسخ ورود توکن JWT ندارد.");
    }

    const user = extractUser(body, email) ?? { email, role: "admin" };
    if (!isAdminRole(user.role)) {
      return actionFail(403, "این حساب دسترسی ادمین ندارد.");
    }

    await setSessionCookie(token);
    return actionOk(user);
  } catch {
    return actionFail(502, `بک‌اند در ${env.apiUrl} در دسترس نیست.`);
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
