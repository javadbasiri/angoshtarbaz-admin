/** True when `redirect()` rejected the server-action promise. */
export function isNextRedirect(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function rethrowNextRedirect(error: unknown): void {
  if (isNextRedirect(error)) throw error;
}
