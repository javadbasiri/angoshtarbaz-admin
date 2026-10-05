import type { GalleryPresign } from "@/types/gallery";

/**
 * Where the file bytes go after `POST /gallery/presign`.
 *
 * - `browser`: the presigned URL is the credential (S3, R2, or any host other
 *   than the Nest API). The browser PUTs the file itself. The admin JWT is not sent.
 * - `server`: mock storage and any upload URL on the Nest origin require the
 *   admin JWT, which stays in the httpOnly cookie. A server action PUTs the bytes.
 */
export type GalleryUploadMode = "browser" | "server";

const BROWSER_PROVIDERS = new Set(["s3", "aws", "r2", "gcs", "public", "signed"]);

export function galleryUploadMode(
  presign: Pick<GalleryPresign, "uploadUrl" | "provider">,
  apiUrl: string,
): GalleryUploadMode {
  const provider = (presign.provider || "").trim().toLowerCase();
  if (BROWSER_PROVIDERS.has(provider)) return "browser";
  if (provider === "mock") return "server";

  try {
    const absolute = new URL(presign.uploadUrl, apiUrl);
    const backend = new URL(apiUrl);
    return absolute.origin === backend.origin ? "server" : "browser";
  } catch {
    return "server";
  }
}

/** Resolve a presigned URL for a browser PUT. Relative URLs use the Nest origin. */
export function absoluteUploadUrl(uploadUrl: string, apiUrl: string): string {
  try {
    return new URL(uploadUrl, apiUrl).toString();
  } catch {
    return uploadUrl;
  }
}

/**
 * Encode a gallery object key for `PUT /gallery/upload/:key`.
 * Rejects traversal and empty segments so the server action cannot be aimed
 * at an arbitrary path.
 */
export function encodeGalleryObjectKey(key: string): string | null {
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  if (!trimmed || trimmed.includes("\\") || trimmed.includes("\0")) return null;
  const segments = trimmed.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) return null;
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}
