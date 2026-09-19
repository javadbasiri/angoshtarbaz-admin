import { NextResponse } from "next/server";
import { backendFetch, extractCreatedProduct, getSessionToken } from "@/lib/backend";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { response, body } = await backendFetch(`/products/${id}`, { method: "GET" }, token);
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "محصول پیدا نشد." }, { status: response.status });
    }
    return NextResponse.json(extractCreatedProduct(body) ?? body);
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
