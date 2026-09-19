import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth-constants";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import type { AdminUser } from "@/types/auth";
import type { CollectionOption } from "@/types/collection";
import type { CreatedProduct } from "@/types/product";

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
  }
  return fallback;
}

export async function backendFetch(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<{ response: Response; body: unknown }> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = await readBody(response);
  return { response, body };
}

export async function backendFetchOrThrow<T = unknown>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const { response, body } = await backendFetch(path, init, token);
  if (!response.ok) {
    throw new ApiError(
      messageFromBody(body, `API ${response.status} ${response.statusText} for ${path}`),
      response.status,
      body,
    );
  }
  return body as T;
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ADMIN_SESSION_COOKIE)?.value;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

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

export function extractUser(body: unknown, emailFallback?: string): AdminUser | null {
  const root = asRecord(body);
  if (!root) return null;
  const candidate =
    asRecord(root.user) ??
    asRecord(asRecord(root.data)?.user) ??
    asRecord(root.data) ??
    root;

  const email =
    (typeof candidate.email === "string" && candidate.email) ||
    emailFallback ||
    "";
  if (!email && !candidate.role && !candidate.roles) return null;

  const role =
    (typeof candidate.role === "string" && candidate.role) ||
    (Array.isArray(candidate.roles) ? String(candidate.roles[0] ?? "admin") : "admin");

  return {
    id: candidate.id != null ? String(candidate.id) : undefined,
    email,
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    role,
  };
}

export function isAdminRole(role: string | undefined): boolean {
  if (!role) return true;
  return role.toLowerCase() === "admin";
}

export function extractId(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  if (root.id != null) return String(root.id);
  const data = asRecord(root.data);
  if (data?.id != null) return String(data.id);
  const product = asRecord(root.product) ?? asRecord(data?.product);
  if (product?.id != null) return String(product.id);
  return null;
}

export function extractCreatedProduct(body: unknown): CreatedProduct | null {
  const id = extractId(body);
  if (!id) return null;
  const root = asRecord(body);
  const data = asRecord(root?.data) ?? asRecord(root?.product) ?? root;
  return {
    id,
    name: typeof data?.name === "string" ? data.name : undefined,
    slug: typeof data?.slug === "string" ? data.slug : undefined,
    status:
      data?.status === "draft" || data?.status === "published"
        ? data.status
        : undefined,
  };
}

export function extractCollections(body: unknown): CollectionOption[] {
  const list = Array.isArray(body)
    ? body
    : Array.isArray(asRecord(body)?.data)
      ? (asRecord(body)?.data as unknown[])
      : Array.isArray(asRecord(body)?.collections)
        ? (asRecord(body)?.collections as unknown[])
        : Array.isArray(asRecord(body)?.items)
          ? (asRecord(body)?.items as unknown[])
          : Array.isArray(asRecord(body)?.results)
            ? (asRecord(body)?.results as unknown[])
            : [];

  return list
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const id = record.id ?? record._id ?? record.slug ?? record.value;
      const name = record.name ?? record.title ?? record.label ?? record.slug;
      if (id == null || name == null) return null;
      return { id: String(id), name: String(name) };
    })
    .filter((item): item is CollectionOption => item !== null);
}

export function extractUploadResult(body: unknown): { id?: string; url?: string } {
  const root = asRecord(body);
  const data = asRecord(root?.data) ?? asRecord(root?.file) ?? asRecord(root?.image) ?? root;
  return {
    id: data?.id != null ? String(data.id) : data?._id != null ? String(data._id) : undefined,
    url:
      typeof data?.url === "string"
        ? data.url
        : typeof data?.src === "string"
          ? data.src
          : undefined,
  };
}
