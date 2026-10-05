const JWT_PATTERN = /\b[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]{10,}){2}\b/g;
const NEST_API_ORIGIN = "http://localhost:3000";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Pull a JWT from common login payloads, including Nest
 * `{ access_token, user: { id, email, firstName, lastName, role } }`.
 */
export function extractToken(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  const nested = asRecord(root.data) ?? asRecord(root.result) ?? root;
  const bags = [nested, root, asRecord(nested.tokens), asRecord(root.tokens)];

  for (const bag of bags) {
    if (!bag) continue;
    for (const key of ["accessToken", "access_token", "token", "jwt", "idToken"]) {
      if (typeof bag[key] === "string" && bag[key]) return bag[key] as string;
    }
  }
  return null;
}

export function redactSecrets(text: string, password?: string): string {
  let out = text.replace(JWT_PATTERN, "[jwt]");
  out = out.replace(
    /("(?:password|pass|pwd|secret)"\s*:\s*")([^"\\]*)(")/gi,
    "$1[redacted]$3",
  );
  out = out.replace(/((?:password|pass|pwd|secret)=)([^&\s]+)/gi, "$1[redacted]");
  if (password && password.length >= 4) {
    out = out.split(password).join("[redacted]");
  }
  return out;
}

export function bodyPreview(body: unknown, password?: string): string {
  let raw: string;
  if (typeof body === "string") raw = body;
  else if (body == null) raw = "";
  else {
    try {
      raw = JSON.stringify(body);
    } catch {
      raw = String(body);
    }
  }
  return redactSecrets(raw.replace(/\s+/g, " ").trim(), password).slice(0, 120);
}

export function isHtmlContentType(contentType: string | null | undefined): boolean {
  return (contentType ?? "").toLowerCase().includes("text/html");
}

function canonicalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    let host = url.hostname.toLowerCase();
    if (host === "127.0.0.1" || host === "::1" || host === "[::1]") host = "localhost";
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    return `${url.protocol}//${host}:${port}`;
  } catch {
    return null;
  }
}

export function originsMatch(apiOrigin: string, adminOrigin: string | null | undefined): boolean {
  if (!adminOrigin) return false;
  const api = canonicalOrigin(apiOrigin);
  const admin = canonicalOrigin(adminOrigin);
  return Boolean(api && admin && api === admin);
}

export function unreachableBackendMessage(url: string): string {
  return `بک‌اند در ${url} در دسترس نیست. نشانی API را با NEXT_PUBLIC_API_URL تنظیم کنید (Nest روی ${NEST_API_ORIGIN})؛ این مقدار هنگام بیلد ثابت می‌شود.`;
}

export function missingTokenMessage(input: {
  status: number;
  contentType: string | null;
  url: string;
  body: unknown;
  apiOrigin: string;
  adminOrigin?: string | null;
  password?: string;
}): string {
  const selfCall =
    isHtmlContentType(input.contentType) || originsMatch(input.apiOrigin, input.adminOrigin);
  const contentType = input.contentType?.trim() || "نامشخص";
  const debug = `وضعیت HTTP ${input.status}، نوع محتوا: ${contentType}، آدرس: ${input.url}، بدنه: ${bodyPreview(input.body, input.password)}`;
  if (selfCall) {
    return `NEXT_PUBLIC_API_URL به خودِ پنل ادمین اشاره می‌کند و باید نشانی Nest باشد (${NEST_API_ORIGIN}). ${debug}`;
  }
  return `پاسخ ورود توکن JWT ندارد. ${debug}`;
}

/**
 * Diagnostic for a login response that did not yield a token.
 * Credential errors from Nest (non-HTML, different origin) stay untouched.
 */
export function loginFailureMessage(input: {
  ok: boolean;
  status: number;
  contentType: string | null;
  url: string;
  body: unknown;
  apiOrigin: string;
  adminOrigin?: string | null;
  password?: string;
}): string | null {
  if (extractToken(input.body)) return null;
  const selfCall =
    isHtmlContentType(input.contentType) || originsMatch(input.apiOrigin, input.adminOrigin);
  if (!input.ok && !selfCall) return null;
  return missingTokenMessage(input);
}
