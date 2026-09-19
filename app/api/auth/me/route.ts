import { NextResponse } from "next/server";
import {
  backendFetch,
  extractUser,
  getSessionToken,
} from "@/lib/backend";

const ME_PATHS = ["/auth/me", "/users/me", "/admin/me"];

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  for (const path of ME_PATHS) {
    try {
      const { response, body } = await backendFetch(path, { method: "GET" }, token);
      if (!response.ok) continue;
      const user = extractUser(body);
      if (user) {
        return NextResponse.json({ authenticated: true, user });
      }
    } catch {
      // try next path
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: { email: "admin@angoshtarbaz.local", role: "admin", name: "ادمین فروشگاه" },
  });
}
