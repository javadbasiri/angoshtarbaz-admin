"use server";

import { actionOk, type ActionResult } from "@/lib/action-result";
import { callAdminBackend } from "@/lib/admin-call";
import { extractCollections } from "@/lib/backend";
import { FALLBACK_COLLECTIONS, type CollectionOption } from "@/types/collection";

function collectionsFrom(body: unknown): CollectionOption[] {
  const list = extractCollections(body);
  return list.length ? list : FALLBACK_COLLECTIONS;
}

/** `GET /collections`, with the local catalog when the backend is empty or offline. */
export async function loadCollectionsAction(): Promise<ActionResult<CollectionOption[]>> {
  const call = await callAdminBackend("/collections", { method: "GET" });
  if (call.kind === "unauthorized") {
    return { ok: false, status: 401, message: call.message };
  }
  if (call.kind === "offline" || call.kind === "http") {
    return actionOk(FALLBACK_COLLECTIONS);
  }
  return actionOk(collectionsFrom(call.body));
}
