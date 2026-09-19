import { NextResponse } from "next/server";
import { backendFetch, extractCollections, getSessionToken } from "@/lib/backend";
import { FALLBACK_COLLECTIONS } from "@/types/collection";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "نشست منقضی شده است." }, { status: 401 });
  }

  try {
    const { response, body } = await backendFetch("/collections", { method: "GET" }, token);
    if (!response.ok) {
      return NextResponse.json({ collections: FALLBACK_COLLECTIONS, source: "fallback" });
    }
    const collections = extractCollections(body);
    return NextResponse.json({
      collections: collections.length ? collections : FALLBACK_COLLECTIONS,
      source: collections.length ? "api" : "fallback",
    });
  } catch {
    return NextResponse.json({ collections: FALLBACK_COLLECTIONS, source: "fallback" });
  }
}
