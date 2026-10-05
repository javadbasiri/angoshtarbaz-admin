import { ApiError } from "@/lib/api";
import { unwrapAction } from "@/lib/call-action";
import { presignGalleryAction, registerGalleryAction } from "@/lib/gallery-actions";
import { isAllowedGalleryFile } from "@/lib/gallery";
import type { GalleryAsset } from "@/types/gallery";

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) {
      if (name.toLowerCase() === "host" || name.toLowerCase() === "authorization") continue;
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

/**
 * Presign on the server (admin JWT), then PUT the bytes from the browser to
 * `uploadUrl`. Mock auth is the `?token=` on that URL; S3 auth is the signed
 * URL. Neither PUT sends the admin JWT. Register stays on the server.
 */
export async function uploadFileToGallery(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<GalleryAsset> {
  const allowed = isAllowedGalleryFile(file);
  if (!allowed.ok) {
    throw new ApiError(allowed.message, 400);
  }

  const contentType = file.type || (allowed.kind === "video" ? "video/mp4" : "image/jpeg");
  onProgress?.(8);
  const presign = await unwrapAction(
    await presignGalleryAction({
      filename: file.name,
      contentType,
      size: file.size,
    }),
  );

  onProgress?.(18);
  await putWithProgress(presign.uploadUrl, file, presign.headers, (percent) => {
    onProgress?.(18 + Math.round(percent * 0.7));
  });

  onProgress?.(92);
  const asset = await unwrapAction(
    await registerGalleryAction({
      key: presign.key,
      publicUrl: presign.publicUrl,
      filename: file.name,
      mimeType: contentType,
      size: file.size,
    }),
  );
  onProgress?.(100);
  return asset;
}
