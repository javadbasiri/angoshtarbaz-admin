import { formatTomanDisplay, irrToToman, tomanToIrr, parseTomanInput } from "@/lib/format";
import {
  emptyProductFormValues,
  RING_SIZE_OPTIONS,
  type CreateProductRequest,
  type GalleryImage,
  type ProductFormValues,
  type ProductRecord,
  type ProductSpecs,
  type ProductStatus,
} from "@/types/product";

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

function extractProductId(body: unknown): string | null {
  const root = asRecord(body);
  if (!root) return null;
  if (root.id != null) return String(root.id);
  const data = asRecord(root.data);
  if (data?.id != null) return String(data.id);
  const product = asRecord(root.product) ?? asRecord(data?.product);
  if (product?.id != null) return String(product.id);
  return null;
}

function productDataRecord(body: unknown): Record<string, unknown> | null {
  const root = asRecord(body);
  if (!root) return null;
  return asRecord(root.data) ?? asRecord(root.product) ?? root;
}

function parseSpecs(value: unknown): ProductSpecs {
  const record = asRecord(value) ?? {};
  return {
    weight: asString(record.weight) ?? "",
    karat: asString(record.karat) ?? "",
    gem: asString(record.gem) ?? "",
    cut: asString(record.cut) ?? "",
    band: asString(record.band) ?? "",
  };
}

function parseSizes(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asFiniteNumber(item))
    .filter((item): item is number => item !== undefined);
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item): item is string => Boolean(item));
}

function parseMediaLists(data: Record<string, unknown>): { imageIds: string[]; urls: string[] } {
  const imageIds = parseStringList(data.imageIds ?? data.image_ids);
  const urls = parseStringList(data.urls);
  const images = Array.isArray(data.images)
    ? data.images
    : Array.isArray(data.gallery)
      ? data.gallery
      : [];

  for (const item of images) {
    const record = asRecord(item);
    if (!record) {
      const url = asString(item);
      if (url) urls.push(url);
      continue;
    }
    const id = asString(record.id) ?? asString(record._id) ?? asString(record.remoteId);
    const url = asString(record.url) ?? asString(record.src) ?? asString(record.href);
    if (id && !imageIds.includes(id)) imageIds.push(id);
    if (url && !urls.includes(url)) urls.push(url);
  }

  return { imageIds, urls };
}

function newImageId() {
  return `img-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Normalize GET /products/:id (and PATCH response) into the create-product shape.
 * Accepts `{ data }`, `{ product }`, or a flat record.
 */
export function extractProduct(body: unknown): ProductRecord | null {
  const id = extractProductId(body);
  if (!id) return null;
  const data = productDataRecord(body);
  if (!data) return null;

  const collection =
    asRecord(data.collection) ?? asRecord(data.category) ?? null;
  const collectionId =
    asString(data.collectionId) ??
    asString(data.collection_id) ??
    asString(collection?.id) ??
    asString(collection?.slug) ??
    "";
  const collectionName =
    asString(data.collectionName) ?? asString(collection?.name) ?? asString(collection?.title);

  const price =
    asFiniteNumber(data.price) ??
    asFiniteNumber(data.priceIrr) ??
    asFiniteNumber(data.priceIRR) ??
    0;

  const status: ProductStatus = data.status === "published" ? "published" : "draft";
  const { imageIds, urls } = parseMediaLists(data);
  const stock = asFiniteNumber(data.stock);

  return {
    id,
    name: asString(data.name) ?? "",
    slug: asString(data.slug),
    description: asString(data.description),
    price,
    collectionId,
    collectionName,
    status,
    sizes: parseSizes(data.sizes),
    specs: parseSpecs(data.specs),
    imageIds,
    urls,
    stock,
  };
}

export function galleryFromProduct(product: ProductRecord): GalleryImage[] {
  const max = Math.max(product.urls.length, product.imageIds.length);
  if (max === 0) return [];

  const items: GalleryImage[] = [];
  for (let index = 0; index < max; index += 1) {
    const url = product.urls[index] ?? "";
    const remoteId = product.imageIds[index];
    items.push({
      id: remoteId || newImageId(),
      url,
      name: remoteId || url || `image-${index + 1}`,
      remoteId,
    });
  }
  return items;
}

export function productToFormValues(product: ProductRecord): ProductFormValues {
  const sizeSet = new Set<string>(RING_SIZE_OPTIONS);
  const sizes = product.sizes.map((size) => String(size)).filter((size) => sizeSet.has(size));

  return {
    ...emptyProductFormValues,
    name: product.name,
    slug: product.slug ?? "",
    slugManual: true,
    description: product.description ?? "",
    priceToman:
      Number.isFinite(product.price) && product.price > 0
        ? formatTomanDisplay(irrToToman(product.price))
        : "",
    collectionId: product.collectionId,
    stock: product.stock != null && Number.isFinite(product.stock) ? String(product.stock) : "0",
    status: product.status,
    sizes,
    specs: { ...product.specs },
    gallery: galleryFromProduct(product),
  };
}

export function formValuesToPayload(
  values: ProductFormValues,
  status: ProductStatus,
  gallery: { imageIds: string[]; urls: string[] },
): CreateProductRequest | null {
  const toman = parseTomanInput(values.priceToman);
  if (toman === null) return null;

  const payload: CreateProductRequest = {
    name: values.name.trim(),
    description: values.description.trim(),
    price: tomanToIrr(toman),
    collectionId: values.collectionId,
    status,
    sizes: values.sizes.map((size) => Number(size)).filter((size) => Number.isFinite(size)),
    specs: { ...values.specs },
  };

  const slug = values.slug.trim();
  if (slug) payload.slug = slug;

  if (gallery.imageIds.length) payload.imageIds = gallery.imageIds;
  if (gallery.urls.length) payload.urls = gallery.urls;

  const stock = Number(values.stock);
  if (Number.isFinite(stock)) payload.stock = stock;

  return payload;
}
