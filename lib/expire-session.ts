"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";

/** Drop the httpOnly admin cookie and leave the list. Not a product API proxy. */
export async function expireAdminSession() {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  redirect("/login");
}
