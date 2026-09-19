import { backendFetch, extractCollections, getSessionToken } from "@/lib/backend";
import { extractProduct, withProductCollection } from "@/lib/product-map";
import { FALLBACK_COLLECTIONS } from "@/types/collection";
import type { ProductEditLoadState } from "@/types/product";

function messageFromUnknown(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function loadProductForEdit(productId: string): Promise<ProductEditLoadState> {
  const token = await getSessionToken();
  if (!token) {
    return { status: "error", message: "نشست منقضی شده است." };
  }

  try {
    const [productResult, collectionsResult] = await Promise.all([
      backendFetch(`/products/${productId}`, { method: "GET" }, token),
      backendFetch("/collections", { method: "GET" }, token).catch(() => null),
    ]);

    if (productResult.response.status === 404) {
      return { status: "not-found" };
    }
    if (!productResult.response.ok) {
      return {
        status: "error",
        message: messageFromUnknown(productResult.body, "بارگذاری محصول ناموفق بود."),
      };
    }

    const product = extractProduct(productResult.body);
    if (!product) {
      return { status: "error", message: "پاسخ محصول ناقص است." };
    }

    const list = collectionsResult ? extractCollections(collectionsResult.body) : [];
    return {
      status: "ready",
      product,
      collections: withProductCollection(list.length ? list : FALLBACK_COLLECTIONS, product),
    };
  } catch {
    return { status: "error", message: "اتصال به بک‌اند برقرار نشد." };
  }
}
