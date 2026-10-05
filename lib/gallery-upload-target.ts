import type { GalleryPresign } from "@/types/gallery";

/**
 * Browser PUT target after `POST /gallery/presign`.
 * `uploadUrl` is the credential for both `mock` (`?token=`) and `s3` (signed URL).
 * The admin JWT is never attached.
 */
export function browserUploadTarget(
  presign: Pick<GalleryPresign, "uploadUrl" | "headers">,
  apiUrl: string,
): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(presign.headers ?? {})) {
    const lower = name.toLowerCase();
    if (lower === "authorization" || lower === "host") continue;
    if (typeof value === "string") headers[name] = value;
  }
  return { url: absoluteUploadUrl(presign.uploadUrl, apiUrl), headers };
}

/** Resolve a presigned URL for a browser PUT. Relative URLs use the Nest origin. */
export function absoluteUploadUrl(uploadUrl: string, apiUrl: string): string {
  try {
    return new URL(uploadUrl, apiUrl).toString();
  } catch {
    return uploadUrl;
  }
}
