"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import { adminCallToResult, callAdminBackend } from "@/lib/admin-call";
import { env } from "@/lib/env";
import {
  extractGalleryAsset,
  extractGalleryList,
  extractPresign,
  isAllowedGalleryFile,
  registerPayload,
} from "@/lib/gallery";
import {
  absoluteUploadUrl,
  encodeGalleryObjectKey,
  galleryUploadMode,
  type GalleryUploadMode,
} from "@/lib/gallery-upload-target";
import type { GalleryAsset, GalleryKind, GalleryListMeta, GalleryPresign, GalleryRegisterInput } from "@/types/gallery";

export type GalleryPresignResult = GalleryPresign & { mode: GalleryUploadMode };

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
  kind: GalleryKind;
}): Promise<ActionResult<GalleryPresignResult>> {
  const call = await callAdminBackend("/gallery/presign", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return adminCallToResult(
    call,
    (body) => {
      const presign = extractPresign(body);
      if (!presign) return actionFail(502, "پاسخ presign گالری ناقص است.");
      const mode = galleryUploadMode(presign, env.apiUrl);
      return actionOk({
        ...presign,
        uploadUrl: mode === "browser" ? absoluteUploadUrl(presign.uploadUrl, env.apiUrl) : presign.uploadUrl,
        mode,
      });
    },
    "دریافت لینک آپلود ناموفق بود.",
  );
}

export async function uploadGalleryFileAction(formData: FormData): Promise<ActionResult<{ ok: true }>> {
  const file = formData.get("file");
  const keyValue = formData.get("key");
  const contentTypeValue = formData.get("contentType");
  if (!(file instanceof File)) {
    return actionFail(400, "فایل تصویر ارسال نشده است.");
  }
  if (typeof keyValue !== "string") {
    return actionFail(400, "کلید فایل نامعتبر است.");
  }

  const allowed = isAllowedGalleryFile(file);
  if (!allowed.ok) return actionFail(400, allowed.message);

  const encodedKey = encodeGalleryObjectKey(keyValue);
  if (!encodedKey) return actionFail(400, "کلید فایل نامعتبر است.");

  const contentType =
    typeof contentTypeValue === "string" && contentTypeValue
      ? contentTypeValue
      : file.type || "application/octet-stream";
  const bytes = await file.arrayBuffer();
  const call = await callAdminBackend(`/gallery/upload/${encodedKey}`, {
    method: "PUT",
    body: bytes,
    headers: { "Content-Type": contentType, Accept: "*/*" },
  });
  return adminCallToResult(call, () => actionOk({ ok: true }), "آپلود فایل ناموفق بود.");
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
