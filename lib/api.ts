export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ApiFetchInit = RequestInit & {
  path: string;
};

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === "string" && body.trim()) return body;
  if (typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "title"]) {
      if (typeof record[key] === "string" && record[key]) {
        return record[key] as string;
      }
    }
    if (Array.isArray(record.errors) && record.errors[0]) {
      const first = record.errors[0] as Record<string, unknown>;
      if (typeof first.message === "string") return first.message;
    }
  }
  return fallback;
}

/**
 * Browser-side fetch against this Next.js app's BFF (`/api/*`).
 * The httpOnly session cookie is sent automatically.
 */
export async function apiFetch<T = unknown>({
  path,
  headers,
  ...init
}: ApiFetchInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  const body = await readBody(response);

  if (!response.ok) {
    throw new ApiError(
      messageFromBody(body, `API ${response.status} ${response.statusText} for ${path}`),
      response.status,
      body,
    );
  }

  return body as T;
}
