"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "@/lib/session-cookie";

/** Drop the httpOnly admin cookie and leave for the login page. */
export async function expireAdminSession() {
  await clearSessionCookie();
  redirect("/login");
}
