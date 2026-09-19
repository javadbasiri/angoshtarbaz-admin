import { NextResponse } from "next/server";
import { backendFetch, getSessionToken } from "@/lib/backend";
import { env } from "@/lib/env";
import { extractPresign, rewriteMockUploadUrl } from "@/lib/gallery";

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  try {
    const { response, body } = await backendFetch(
      "/gallery/presign",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "دریافت لینک آپلود ناموفق بود." }, {
        status: response.status,
      });
    }
    const presign = extractPresign(body);
    if (!presign) {
      return NextResponse.json({ message: "پاسخ presign گالری ناقص است." }, { status: 502 });
    }
    return NextResponse.json(rewriteMockUploadUrl(presign, env.apiUrl));
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
