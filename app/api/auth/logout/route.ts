import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";

export async function POST() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ authenticated: false });
}
