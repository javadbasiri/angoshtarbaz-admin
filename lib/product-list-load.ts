import { backendFetch, getSessionToken } from "@/lib/backend";
import { env } from "@/lib/env";
import {
  extractProductList,
  productListApiPath,
  type ProductListLoad,
  type ProductListQuery,
} from "@/lib/product-list";

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

/**
 * Load the admin product list from the Nest backend itself:
 * `GET ${NEXT_PUBLIC_API_URL}/products` with the admin JWT.
 * The browser never calls a Next.js `/api/products` route for this list.
 */
export async function loadProductList(query: ProductListQuery): Promise<ProductListLoad> {
  const token = await getSessionToken();
  if (!token) return { status: "unauthorized" };

  try {
    const { response, body } = await backendFetch(
      productListApiPath(query),
      { method: "GET" },
      token,
    );
    if (response.status === 401) return { status: "unauthorized" };
    if (!response.ok) {
      return {
        status: "error",
        message: messageFrom(body, "بارگذاری فهرست محصولات ناموفق بود."),
      };
    }
    return { status: "ready", result: extractProductList(body, query) };
  } catch {
    return {
      status: "error",
      message: `اتصال به بک‌اند (${env.apiUrl}) برقرار نشد.`,
    };
  }
}
