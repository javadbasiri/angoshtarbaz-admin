import { NextResponse } from "next/server";
import { backendFetch, extractUploadResult, getSessionToken } from "@/lib/backend";
import { env } from "@/lib/env";

const UPLOAD_PATHS = ["/uploads", "/media", "/images", "/files"];

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "فایل تصویر ارسال نشده است." }, { status: 400 });
  }

  for (const path of UPLOAD_PATHS) {
    const body = new FormData();
    body.append("file", file, file.name);
    try {
      const { response, body: payload } = await backendFetch(
        path,
        { method: "POST", body },
        token,
      );
      if (response.status === 404) continue;
      if (!response.ok) {
        return NextResponse.json(payload ?? { message: "آپلود ناموفق بود." }, {
          status: response.status,
        });
      }
      return NextResponse.json(extractUploadResult(payload));
    } catch {
      // try next path
    }
  }

  return NextResponse.json(
    { message: `هیچ مسیر آپلودی روی ${env.apiUrl} در دسترس نبود.` },
    { status: 404 },
  );
}
