import { NextResponse } from "next/server";
import { backendFetch, getSessionToken } from "@/lib/backend";
import { extractProduct } from "@/lib/product-map";

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
    return NextResponse.json(extractProduct(body) ?? body);
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  try {
    const { response, body } = await backendFetch(
      `/products/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    );
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "ذخیره محصول ناموفق بود." }, {
        status: response.status,
      });
    }
    return NextResponse.json(extractProduct(body) ?? body);
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
