import { NextResponse } from "next/server";
import { backendFetch, getSessionToken } from "@/lib/backend";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { response, body } = await backendFetch(`/gallery/${id}`, { method: "DELETE" }, token);
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "حذف فایل ناموفق بود." }, { status: response.status });
    }
    return NextResponse.json(body ?? { ok: true }, { status: response.status === 204 ? 200 : response.status });
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
