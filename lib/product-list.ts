export const DEFAULT_PRODUCT_LIST_LIMIT = 20;
export const MAX_PRODUCT_LIST_LIMIT = 100;

export type ProductListStatus = "all" | "published" | "draft";

export type ProductListQuery = {
  status: ProductListStatus;
  search: string;
  page: number;
  limit: number;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  title: string;
  /** Integer IRR. */
  price: number;
  currency: string;
  status: "draft" | "published";
  imageUrl: string;
  thumbnail: string;
  collection: string;
  updatedAt: string;
};

export type ProductStatusCounts = {
  all: number | null;
  published: number | null;
  draft: number | null;
};

export type ProductListMeta = {
  page: number;
  limit: number;
  total: number | null;
  totalPages: number | null;
  hasNext: boolean;
  counts: ProductStatusCounts | null;
};

export type ProductListResponse = {
  data: ProductListItem[];
  meta: ProductListMeta;
};

export type ProductListLoad =
  | { status: "ready"; result: ProductListResponse }
  | { status: "error"; message: string }
  | { status: "unauthorized" };

export type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
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

function readParam(input: SearchParamInput, key: string): string {
  if (input instanceof URLSearchParams) return input.get(key) ?? "";
  const value = input[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parseStatus(raw: string): ProductListStatus {
  if (raw === "published" || raw === "draft" || raw === "all") return raw;
  return "all";
}

function parsePage(raw: string): number {
  if (!raw.trim()) return 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(1_000_000, Math.round(parsed));
}

function parseLimit(raw: string): number {
  if (!raw.trim()) return DEFAULT_PRODUCT_LIST_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PRODUCT_LIST_LIMIT;
  return Math.min(MAX_PRODUCT_LIST_LIMIT, Math.round(parsed));
}

export function parseProductListQuery(input: SearchParamInput): ProductListQuery {
  return {
    status: parseStatus(readParam(input, "status").trim()),
    search: readParam(input, "search").trim().slice(0, 200),
    page: parsePage(readParam(input, "page")),
    limit: parseLimit(readParam(input, "limit")),
  };
}

/** Browser URL. Defaults (all / page 1 / limit 20 / empty search) are omitted. */
export function productListHref(query: ProductListQuery, pathname = "/products"): string {
  const params = new URLSearchParams();
  if (query.status !== "all") params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.limit !== DEFAULT_PRODUCT_LIST_LIMIT) params.set("limit", String(query.limit));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** Backend path. Always sends status, page, and limit so drafts are included. */
export function productListApiPath(query: ProductListQuery): string {
  const params = new URLSearchParams();
  params.set("status", query.status);
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  return `/products?${params.toString()}`;
}

export function productEditHref(id: string): string {
  return `/products/${encodeURIComponent(id)}/edit`;
}

export function productDisplayName(item: ProductListItem): string {
  return item.name.trim() || item.title.trim() || item.slug || item.id;
}

export function productSubline(item: ProductListItem): string {
  const title = item.title.trim();
  if (!title || title === productDisplayName(item)) return "";
  return title;
}

export function productThumbSrc(item: ProductListItem): string {
  return item.thumbnail.trim() || item.imageUrl.trim();
}

function collectionLabel(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  if (!record) return "";
  return (
    asString(record.name)?.trim() ||
    asString(record.title)?.trim() ||
    asString(record.label)?.trim() ||
    ""
  );
}

function listArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const root = asRecord(body);
  if (!root) return [];
  for (const key of ["data", "products", "items", "results"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  const nested = asRecord(root.data);
  if (!nested) return [];
  for (const key of ["products", "items", "results"]) {
    if (Array.isArray(nested[key])) return nested[key] as unknown[];
  }
  return [];
}

function parseListItem(value: unknown): ProductListItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id) ?? asString(record._id);
  if (!id) return null;

  const name = asString(record.name)?.trim() ?? "";
  const title = (asString(record.title) ?? asString(record.subtitle) ?? "").trim();
  const price =
    asFiniteNumber(record.price) ??
    asFiniteNumber(record.priceIrr) ??
    asFiniteNumber(record.priceIRR) ??
    0;

  return {
    id,
    slug: asString(record.slug)?.trim() ?? "",
    name,
    title,
    price,
    currency: asString(record.currency)?.trim() || "IRR",
    status: record.status === "published" ? "published" : "draft",
    imageUrl:
      asString(record.imageUrl)?.trim() ||
      asString(record.image)?.trim() ||
      asString(record.url)?.trim() ||
      "",
    thumbnail: asString(record.thumbnail)?.trim() || asString(record.thumbUrl)?.trim() || "",
    collection: collectionLabel(record.collection ?? record.collectionName),
    updatedAt: asString(record.updatedAt)?.trim() || asString(record.updated_at)?.trim() || "",
  };
}

function readCount(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed == null || parsed < 0) return null;
  return Math.round(parsed);
}

function readPositive(value: unknown, fallback: number): number {
  const parsed = asFiniteNumber(value);
  if (parsed == null || parsed < 1) return fallback;
  return Math.round(parsed);
}

function metaRecord(body: unknown): Record<string, unknown> | null {
  const root = asRecord(body);
  if (!root) return null;
  return (
    asRecord(root.meta) ??
    asRecord(root.pagination) ??
    asRecord(asRecord(root.data)?.meta) ??
    null
  );
}

function parseCounts(
  meta: Record<string, unknown> | null,
  root: Record<string, unknown> | null,
): ProductStatusCounts | null {
  const bags = [
    asRecord(meta?.counts),
    asRecord(meta?.statusCounts),
    asRecord(meta?.statuses),
    asRecord(meta?.facets),
    asRecord(root?.counts),
  ];

  for (const bag of bags) {
    if (!bag) continue;
    const all = readCount(bag.all ?? bag.total);
    const published = readCount(bag.published);
    const draft = readCount(bag.draft);
    if (all == null && published == null && draft == null) continue;
    return { all, published, draft };
  }

  if (!meta) return null;
  const all = readCount(meta.allCount);
  const published = readCount(meta.publishedCount);
  const draft = readCount(meta.draftCount);
  if (all == null && published == null && draft == null) return null;
  return { all, published, draft };
}

export function extractProductList(body: unknown, requested: ProductListQuery): ProductListResponse {
  const data = listArray(body)
    .map(parseListItem)
    .filter((item): item is ProductListItem => item !== null);

  const root = asRecord(body);
  const meta = metaRecord(body);
  const page = readPositive(meta?.page ?? meta?.currentPage, requested.page);
  const limit = readPositive(meta?.limit ?? meta?.perPage ?? meta?.pageSize, requested.limit);

  let total = readCount(meta?.total ?? meta?.totalCount ?? meta?.count);
  if (total == null && data.length < limit) {
    total = (page - 1) * limit + data.length;
  }

  let totalPages = readCount(meta?.totalPages ?? meta?.pages ?? meta?.pageCount);
  if (totalPages == null && total != null) {
    totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  }
  if (totalPages === 0) totalPages = 1;

  const hasNext = totalPages != null ? page < totalPages : data.length >= limit;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      counts: parseCounts(meta, root),
    },
  };
}
