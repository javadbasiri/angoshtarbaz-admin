import { toPersianDigits } from "@/lib/format";
import type {
  GalleryAsset,
  GalleryKind,
  GalleryListMeta,
  GalleryPresign,
  GalleryRegisterInput,
} from "@/types/gallery";

export const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4"]);

const PLACEHOLDER_CLASSES = ["ph-1", "ph-2", "ph-3", "ph-4", "ph-5", "ph-6", "ph-7", "ph-8"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function galleryKindFrom(mimeType?: string, filename?: string, kind?: string): GalleryKind {
  if (kind === "video" || kind === "image") return kind;
  const mime = (mimeType || "").toLowerCase();
  const name = (filename || "").toLowerCase();
  if (mime.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov")) {
    return "video";
  }
  return "image";
}

export function isAllowedGalleryFile(file: File): { ok: true; kind: GalleryKind } | { ok: false; message: string } {
  const mime = file.type.toLowerCase();
  const kind = galleryKindFrom(mime, file.name);
  if (kind === "image") {
    if (!ALLOWED_IMAGE_TYPES.has(mime) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      return { ok: false, message: `قالب پشتیبانی نمی‌شود (${file.name.split(".").pop()?.toUpperCase() || "نامشخص"})` };
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return { ok: false, message: "حجم بیش از ۱۲ مگابایت" };
    }
    return { ok: true, kind: "image" };
  }
  if (!ALLOWED_VIDEO_TYPES.has(mime) && !/\.mp4$/i.test(file.name)) {
    return { ok: false, message: `قالب پشتیبانی نمی‌شود (${file.name.split(".").pop()?.toUpperCase() || "نامشخص"})` };
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return { ok: false, message: "حجم بیش از ۵۰ مگابایت" };
  }
  return { ok: true, kind: "video" };
}

export function placeholderClass(id: string, kind: GalleryKind): string {
  if (kind === "video") return "ph-video";
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % PLACEHOLDER_CLASSES.length;
  }
  return PLACEHOLDER_CLASSES[hash] ?? "ph-1";
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${toPersianDigits(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = Math.round(bytes / 1024);
    return `${toPersianDigits(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  const rounded = mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", "٫");
  return `${toPersianDigits(text)} MB`;
}

export function formatGalleryCount(input: {
  total: number;
  images: number;
  videos: number;
  uploading?: number;
  failed?: number;
}): string {
  const parts = [`${toPersianDigits(input.total)} فایل`];
  if (input.images) parts.push(`${toPersianDigits(input.images)} تصویر`);
  if (input.videos) parts.push(`${toPersianDigits(input.videos)} ویدیو`);
  if (input.uploading) parts.push(`${toPersianDigits(input.uploading)} در حال آپلود`);
  if (input.failed) parts.push(`${toPersianDigits(input.failed)} ناموفق`);
  return parts.join(" · ");
}

export function extractGalleryAsset(value: unknown): GalleryAsset | null {
  const root = asRecord(value);
  if (!root) return null;
  const data = asRecord(root.data) ?? asRecord(root.asset) ?? asRecord(root.file) ?? asRecord(root.image) ?? root;
  const id = asString(data.id) ?? asString(data._id);
  if (!id) return null;
  const filename =
    asString(data.filename) ??
    asString(data.originalName) ??
    asString(data.originalFilename) ??
    asString(data.name) ??
    asString(data.key) ??
    id;
  const mimeType =
    asString(data.mimeType) ?? asString(data.contentType) ?? asString(data.type) ?? "application/octet-stream";
  const publicUrl =
    asString(data.publicUrl) ??
    asString(data.url) ??
    asString(data.src) ??
    asString(data.href) ??
    "";
  const kind = galleryKindFrom(mimeType, filename, asString(data.kind) ?? asString(data.mediaType));
  return {
    id,
    key: asString(data.key),
    publicUrl,
    filename,
    mimeType,
    size: asFiniteNumber(data.size) ?? asFiniteNumber(data.bytes) ?? 0,
    kind,
    createdAt: asString(data.createdAt) ?? asString(data.created_at),
  };
}

export function extractGalleryList(body: unknown): { items: GalleryAsset[]; meta: GalleryListMeta } {
  const root = asRecord(body);
  const rawList = Array.isArray(body)
    ? body
    : Array.isArray(root?.data)
      ? (root?.data as unknown[])
      : Array.isArray(root?.items)
        ? (root?.items as unknown[])
        : Array.isArray(root?.results)
          ? (root?.results as unknown[])
          : Array.isArray(root?.assets)
            ? (root?.assets as unknown[])
            : [];

  const items = rawList
    .map((item) => extractGalleryAsset(item))
    .filter((item): item is GalleryAsset => item !== null);

  const metaRecord = asRecord(root?.meta) ?? asRecord(root?.pagination) ?? {};
  const total =
    asFiniteNumber(metaRecord.total) ??
    asFiniteNumber(metaRecord.count) ??
    asFiniteNumber(root?.total) ??
    items.length;

  return {
    items,
    meta: {
      total,
      page: asFiniteNumber(metaRecord.page),
      limit: asFiniteNumber(metaRecord.limit) ?? asFiniteNumber(metaRecord.perPage),
    },
  };
}

export function extractPresign(body: unknown): GalleryPresign | null {
  const root = asRecord(body);
  if (!root) return null;
  const data = asRecord(root.data) ?? root;
  const uploadUrl = asString(data.uploadUrl) ?? asString(data.url) ?? asString(data.signedUrl);
  const key = asString(data.key) ?? asString(data.objectKey);
  if (!uploadUrl || !key) return null;
  const headersRecord = asRecord(data.headers) ?? {};
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(headersRecord)) {
    if (typeof value === "string") headers[name] = value;
  }
  return {
    uploadUrl,
    headers,
    key,
    publicUrl: asString(data.publicUrl) ?? asString(data.url) ?? "",
    provider: asString(data.provider),
  };
}

export function registerPayload(input: GalleryRegisterInput): Record<string, unknown> {
  return {
    key: input.key,
    publicUrl: input.publicUrl,
    url: input.publicUrl,
    filename: input.filename,
    originalName: input.filename,
    mimeType: input.mimeType,
    contentType: input.mimeType,
    size: input.size,
    kind: input.kind,
  };
}

export function galleryItemsFromClientPayload(payload: unknown): GalleryAsset[] {
  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: GalleryAsset[] }).items;
  }
  return extractGalleryList(payload).items;
}

export function rewriteMockUploadUrl(presign: GalleryPresign, apiUrl: string): GalleryPresign {
  const keyPath = presign.key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const sameOriginProxy = `/api/gallery/upload/${keyPath}`;
  if ((presign.provider || "").toLowerCase() === "mock") {
    return { ...presign, uploadUrl: sameOriginProxy };
  }

  try {
    const absolute = new URL(presign.uploadUrl, apiUrl);
    const backend = new URL(apiUrl);
    if (absolute.origin === backend.origin) {
      return { ...presign, uploadUrl: sameOriginProxy };
    }
    return { ...presign, uploadUrl: absolute.toString() };
  } catch {
    if (presign.uploadUrl.startsWith("/gallery/upload/")) {
      return { ...presign, uploadUrl: sameOriginProxy };
    }
    return presign;
  }
}
