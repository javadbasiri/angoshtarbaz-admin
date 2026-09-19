import { env } from "@/lib/env";

type ApiFetchInit = RequestInit & {
  /** Path beginning with `/`, e.g. `/products`. */
  path: string;
};

/**
 * Thin fetch wrapper aimed at angoshtarbaz-backend.
 * Auth headers and error mapping land in ANG-A0+.
 */
export async function apiFetch<T = unknown>({
  path,
  headers,
  ...init
}: ApiFetchInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API ${response.status} ${response.statusText} for ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
