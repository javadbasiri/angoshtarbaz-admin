import { apiFetch, ApiError } from "@/lib/api";
import {
  extractGalleryAsset,
  extractPresign,
  isAllowedGalleryFile,
  registerPayload,
} from "@/lib/gallery";
import type { GalleryAsset, GalleryPresign } from "@/types/gallery";

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.withCredentials = url.startsWith("/") || url.startsWith(window.location.origin);
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === "host") continue;
      xhr.setRequestHeader(name, value);
    }
    if (!Object.keys(headers).some((name) => name.toLowerCase() === "content-type") && file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new ApiError(xhr.responseText || "آپلود فایل ناموفق بود.", xhr.status || 502));
    };
    xhr.onerror = () => reject(new ApiError("اتصال برای آپلود برقرار نشد.", 502));
    xhr.send(file);
  });
}

export async function uploadFileToGallery(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<GalleryAsset> {
  const allowed = isAllowedGalleryFile(file);
  if (!allowed.ok) {
    throw new ApiError(allowed.message, 400);
  }

  onProgress?.(8);
  const presignBody = await apiFetch<unknown>({
    path: "/api/gallery/presign",
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || (allowed.kind === "video" ? "video/mp4" : "image/jpeg"),
      size: file.size,
      kind: allowed.kind,
    }),
  });

  const presign = extractPresign(presignBody);
  if (!presign) {
    throw new ApiError("پاسخ presign گالری ناقص است.", 502);
  }

  onProgress?.(18);
  await putWithProgress(presign.uploadUrl, file, presign.headers, (percent) => {
    onProgress?.(18 + Math.round(percent * 0.7));
  });

  onProgress?.(92);
  const registered = await apiFetch<unknown>({
    path: "/api/gallery",
    method: "POST",
    body: JSON.stringify(
      registerPayload({
        key: presign.key,
        publicUrl: presign.publicUrl,
        filename: file.name,
        mimeType: file.type || (allowed.kind === "video" ? "video/mp4" : "application/octet-stream"),
        size: file.size,
        kind: allowed.kind,
      }),
    ),
  });

  const asset = extractGalleryAsset(registered);
  if (!asset) {
    throw new ApiError("ثبت فایل در گالری ناموفق بود.", 502);
  }
  onProgress?.(100);
  return asset;
}

export type { GalleryPresign };
