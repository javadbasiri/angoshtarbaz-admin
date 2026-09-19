import { NextResponse } from "next/server";
import { backendFetch, extractCreatedProduct, getSessionToken } from "@/lib/backend";

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
      "/products",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );

    if (!response.ok) {
      return NextResponse.json(body ?? { message: "ایجاد محصول ناموفق بود." }, {
        status: response.status,
      });
    }

    const created = extractCreatedProduct(body);
    return NextResponse.json(created ?? body, { status: response.status === 201 ? 201 : 200 });
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
