import { NextResponse } from "next/server";
import { backendFetch, getSessionToken } from "@/lib/backend";
import { extractGalleryAsset, extractGalleryList, registerPayload } from "@/lib/gallery";
import type { GalleryKind } from "@/types/gallery";

export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  const incoming = new URL(request.url);
  const search = incoming.searchParams.toString();
  const path = search ? `/gallery?${search}` : "/gallery?limit=100";

  try {
    const { response, body } = await backendFetch(path, { method: "GET" }, token);
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "بارگذاری گالری ناموفق بود." }, {
        status: response.status,
      });
    }
    return NextResponse.json(extractGalleryList(body));
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const key = typeof payload.key === "string" ? payload.key : "";
  if (!key) {
    return NextResponse.json({ message: "کلید فایل برای ثبت گالری لازم است." }, { status: 400 });
  }

  const forwarded = registerPayload({
    key,
    publicUrl: typeof payload.publicUrl === "string" ? payload.publicUrl : "",
    filename: typeof payload.filename === "string" ? payload.filename : key,
    mimeType: typeof payload.mimeType === "string" ? payload.mimeType : "application/octet-stream",
    size: typeof payload.size === "number" ? payload.size : 0,
    kind: payload.kind === "video" ? "video" : ("image" as GalleryKind),
  });

  try {
    const { response, body } = await backendFetch(
      "/gallery",
      { method: "POST", body: JSON.stringify(forwarded) },
      token,
    );
    if (!response.ok) {
      return NextResponse.json(body ?? { message: "ثبت فایل در گالری ناموفق بود." }, {
        status: response.status,
      });
    }
    return NextResponse.json(extractGalleryAsset(body) ?? body, {
      status: response.status === 201 ? 201 : 200,
    });
  } catch {
    return NextResponse.json({ message: "اتصال به بک‌اند برقرار نشد." }, { status: 502 });
  }
}
