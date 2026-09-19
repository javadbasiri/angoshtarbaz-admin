import { NextResponse } from "next/server";
import { backendFetch, getSessionToken } from "@/lib/backend";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  const { key } = await params;
  const objectKey = key.map((segment) => encodeURIComponent(segment)).join("/");
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const bytes = await request.arrayBuffer();

  try {
    const { response, body } = await backendFetch(
      `/gallery/upload/${objectKey}`,
      {
        method: "PUT",
        body: bytes,
        headers: { "Content-Type": contentType, Accept: "*/*" },
      },
      token,
    );
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "آپلود فایل ناموفق بود." }, { status: response.status });
    }
    return NextResponse.json(body ?? { ok: true }, { status: response.status === 204 ? 200 : response.status });
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
