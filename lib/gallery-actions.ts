"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import { adminCallToResult, callAdminBackend } from "@/lib/admin-call";
import { env } from "@/lib/env";
import { extractGalleryAsset, extractGalleryList, extractPresign, presignPayload, registerPayload } from "@/lib/gallery";
import { browserUploadTarget } from "@/lib/gallery-upload-target";
import type { GalleryAsset, GalleryListMeta, GalleryPresign, GalleryRegisterInput } from "@/types/gallery";

export async function listGalleryAction(
  limit = 100,
): Promise<ActionResult<{ items: GalleryAsset[]; meta: GalleryListMeta }>> {
  const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 100;
  const call = await callAdminBackend(`/gallery?limit=${safeLimit}`, { method: "GET" });
  return adminCallToResult(call, (body) => actionOk(extractGalleryList(body)), "بارگذاری گالری ناموفق بود.");
}

export async function presignGalleryAction(input: {
  filename: string;
  contentType: string;
  size: number;
}): Promise<ActionResult<GalleryPresign>> {
  const call = await callAdminBackend("/gallery/presign", {
    method: "POST",
    body: JSON.stringify(presignPayload(input)),
  });
  return adminCallToResult(
    call,
    (body) => {
      const presign = extractPresign(body);
      if (!presign) return actionFail(502, "پاسخ presign گالری ناقص است.");
      const target = browserUploadTarget(presign, env.apiUrl);
      return actionOk({ ...presign, uploadUrl: target.url, headers: target.headers });
    },
    "دریافت لینک آپلود ناموفق بود.",
  );
}

export async function registerGalleryAction(
  input: GalleryRegisterInput,
): Promise<ActionResult<GalleryAsset>> {
  if (!input.key) return actionFail(400, "کلید فایل برای ثبت گالری لازم است.");
  const call = await callAdminBackend("/gallery", {
    method: "POST",
    body: JSON.stringify(registerPayload(input)),
  });
  return adminCallToResult(
    call,
    (body) => {
      const asset = extractGalleryAsset(body);
      if (!asset) return actionFail(502, "ثبت فایل در گالری ناموفق بود.");
      return actionOk(asset);
    },
    "ثبت فایل در گالری ناموفق بود.",
  );
}

export async function deleteGalleryAction(id: string): Promise<ActionResult<{ ok: true }>> {
  const call = await callAdminBackend(`/gallery/${encodeURIComponent(id)}`, { method: "DELETE" });
  return adminCallToResult(call, () => actionOk({ ok: true }), "حذف فایل ناموفق بود.");
}
