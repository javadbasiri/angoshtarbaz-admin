"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import { adminCallToResult, callAdminBackend } from "@/lib/admin-call";
import { extractCreatedProduct } from "@/lib/backend";
import { extractProduct } from "@/lib/product-map";
import type { CreateProductRequest, CreatedProduct, ProductRecord } from "@/types/product";

function productPath(productId: string) {
  return `/products/${encodeURIComponent(productId)}`;
}

export async function createProductAction(
  payload: CreateProductRequest,
): Promise<ActionResult<CreatedProduct>> {
  const call = await callAdminBackend("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return adminCallToResult(
    call,
    (body) => {
      const created = extractCreatedProduct(body);
      if (!created?.id) return actionFail(502, "پاسخ ایجاد محصول ناقص است.");
      return actionOk(created);
    },
    "ایجاد محصول ناموفق بود.",
  );
}

export async function getProductAction(productId: string): Promise<ActionResult<ProductRecord>> {
  const call = await callAdminBackend(productPath(productId), { method: "GET" });
  if (call.kind === "http" && call.status === 404) {
    return actionFail(404, "محصول پیدا نشد.");
  }
  return adminCallToResult(
    call,
    (body) => {
      const product = extractProduct(body);
      if (!product) return actionFail(502, "پاسخ محصول ناقص است.");
      return actionOk(product);
    },
    "بارگذاری محصول ناموفق بود.",
  );
}

export async function updateProductAction(
  productId: string,
  payload: CreateProductRequest,
): Promise<ActionResult<ProductRecord>> {
  const call = await callAdminBackend(productPath(productId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (call.kind === "http" && call.status === 404) {
    return actionFail(404, "محصول پیدا نشد.");
  }
  return adminCallToResult(
    call,
    (body) => {
      const product = extractProduct(body);
      if (!product) return actionFail(502, "پاسخ محصول ناقص است.");
      return actionOk(product);
    },
    "ذخیره محصول ناموفق بود.",
  );
}
