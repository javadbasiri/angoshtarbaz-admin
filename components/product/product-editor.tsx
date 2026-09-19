"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/shell";
import { AlertIcon, CheckIcon, SearchIcon } from "@/components/admin/icons";
import type { AdminBreadcrumbItem } from "@/components/admin/header";
import { ProductFormFields } from "@/components/product/product-form-fields";
import { ProductFormSkeleton } from "@/components/product/product-skeleton";
import { useProductForm } from "@/components/product/use-product-form";
import { apiFetch, ApiError } from "@/lib/api";
import { extractProduct, productToFormValues } from "@/lib/product-map";
import { FALLBACK_COLLECTIONS, type CollectionOption } from "@/types/collection";
import type { ProductRecord, ProductStatus } from "@/types/product";

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; product: ProductRecord; collections: CollectionOption[] };

function parseCollections(payload: unknown): CollectionOption[] {
  if (Array.isArray(payload)) return payload as CollectionOption[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { collections?: unknown }).collections)) {
    return (payload as { collections: CollectionOption[] }).collections;
  }
  return [];
}

function withProductCollection(
  list: CollectionOption[],
  product: ProductRecord,
): CollectionOption[] {
  if (!product.collectionId) return list;
  if (list.some((item) => item.id === product.collectionId)) return list;
  return [
    ...list,
    { id: product.collectionId, name: product.collectionName || product.collectionId },
  ];
}

function editRoute(productId: string) {
  return `/admin/products/${productId}/edit`;
}

export function ProductEditor({ productId }: { productId: string }) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const [productPayload, collectionsPayload] = await Promise.all([
          apiFetch<unknown>({ path: `/api/products/${encodeURIComponent(productId)}` }),
          apiFetch<unknown>({ path: "/api/collections" }).catch(() => FALLBACK_COLLECTIONS),
        ]);
        if (cancelled) return;

        const product = extractProduct(productPayload);
        if (!product) {
          setLoad({ status: "error", message: "پاسخ محصول ناقص است." });
          return;
        }

        const list = parseCollections(collectionsPayload);
        const collections = withProductCollection(
          list.length ? list : FALLBACK_COLLECTIONS,
          product,
        );
        setLoad({ status: "ready", product, collections });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setLoad({ status: "not-found" });
          return;
        }
        setLoad({
          status: "error",
          message: error instanceof ApiError ? error.message : "اتصال به سرور برقرار نشد.",
        });
      }
    }

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId, reloadToken]);

  const breadcrumb = useMemo((): AdminBreadcrumbItem[] => {
    const items: AdminBreadcrumbItem[] = [{ href: "/", label: "محصولات" }];
    if (load.status === "ready") {
      const collectionName =
        load.collections.find((item) => item.id === load.product.collectionId)?.name ||
        load.product.collectionName ||
        load.product.name ||
        "محصول";
      items.push({ href: `/products/${encodeURIComponent(productId)}/edit`, label: collectionName });
    }
    items.push({ label: "ویرایش" });
    return items;
  }, [load, productId]);

  return (
    <AdminShell title="ویرایش محصول" breadcrumb={breadcrumb}>
      {load.status === "loading" ? <ProductFormSkeleton variant="edit" /> : null}
      {load.status === "not-found" ? (
        <ProductNotFound productId={productId} />
      ) : null}
      {load.status === "error" ? (
        <ProductLoadError
          message={load.message}
          onRetry={() => {
            setLoad({ status: "loading" });
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}
      {load.status === "ready" ? (
        <ProductEditForm
          productId={productId}
          product={load.product}
          collections={load.collections}
        />
      ) : null}
    </AdminShell>
  );
}

function ProductNotFound({ productId }: { productId: string }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        <SearchIcon />
      </div>
      <h2 className="empty-state__title">محصول یافت نشد</h2>
      <p className="empty-state__body">
        شناسه <code dir="ltr">{productId}</code> در فهرست محصولات وجود ندارد یا حذف شده است.
      </p>
      <p className="empty-state__route" dir="ltr">
        {editRoute(productId)}
      </p>
      <div className="empty-state__actions">
        <Link className="btn btn--primary" href="/">
          بازگشت به محصولات
        </Link>
        <Link className="btn btn--secondary" href="/products/new">
          افزودن محصول جدید
        </Link>
      </div>
    </div>
  );
}

function ProductLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-state__icon" aria-hidden="true">
        <AlertIcon />
      </div>
      <h2 className="empty-state__title">بارگذاری محصول ناموفق بود</h2>
      <p className="empty-state__body">{message}</p>
      <div className="empty-state__actions">
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          تلاش مجدد
        </button>
        <Link className="btn btn--secondary" href="/">
          بازگشت به محصولات
        </Link>
      </div>
    </div>
  );
}

function ProductEditForm({
  productId,
  product,
  collections,
}: {
  productId: string;
  product: ProductRecord;
  collections: CollectionOption[];
}) {
  const form = useProductForm({
    initial: productToFormValues(product),
    collections,
    skipCollectionFetch: true,
  });

  const busy = form.submitting !== null;
  const savingPrimary = form.submitting === "save" || form.submitting === "published";
  const savingDraft = form.submitting === "draft";

  async function handleSave(status: ProductStatus, kind: "draft" | "save") {
    form.setAlert(null);
    if (!form.checkValidity()) return;

    form.setSubmitting(kind === "draft" ? "draft" : "save");
    try {
      const payload = await form.buildPayload(status);
      if (!payload) return;

      const updated = await apiFetch<unknown>({
        path: `/api/products/${encodeURIComponent(productId)}`,
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const next = extractProduct(updated);
      const productName = next?.name || form.values.name;
      form.patch({ status });
      if (status === "published") {
        form.setAlert({
          kind: "success",
          title: "تغییرات با موفقیت ذخیره شد",
          body: `${productName} به‌روزرسانی شد و در فروشگاه منعکس می‌شود.`,
        });
      } else {
        form.setAlert({
          kind: "success",
          title: "پیش‌نویس ذخیره شد",
          body: `${productName} فقط در ادمین قابل مشاهده است.`,
        });
      }
      form.setToast("ذخیره انجام شد");
    } catch (error) {
      form.setAlert({
        kind: "error",
        title: "ذخیره محصول انجام نشد",
        body: error instanceof ApiError ? error.message : "ذخیره تغییرات با خطا روبه‌رو شد.",
      });
    } finally {
      form.setSubmitting(null);
    }
  }

  return (
    <div className={busy ? "is-saving" : undefined}>
      {busy ? (
        <div className="alert alert--info" role="status">
          <span className="alert__icon">
            <span
              className="btn__spinner"
              style={{
                borderColor: "rgba(84,25,38,0.25)",
                borderTopColor: "var(--color-accent)",
                width: 18,
                height: 18,
              }}
              aria-hidden="true"
            />
          </span>
          <div>
            <p className="alert__title">در حال ذخیره تغییرات…</p>
            <p className="alert__body">لطفاً صفحه را نبندید تا ذخیره کامل شود.</p>
          </div>
        </div>
      ) : form.alert ? (
        <div
          className={`alert alert--${form.alert.kind}`}
          role={form.alert.kind === "error" ? "alert" : "status"}
        >
          <span className="alert__icon">
            {form.alert.kind === "error" ? <AlertIcon /> : <CheckIcon />}
          </span>
          <div>
            <p className="alert__title">{form.alert.title}</p>
            <p className="alert__body">{form.alert.body}</p>
          </div>
        </div>
      ) : null}

      <div className="product-meta" aria-label="شناسه محصول">
        <span className="product-meta__id">
          <span className="product-meta__label">شناسه:</span>{" "}
          <code dir="ltr">{productId}</code>
        </span>
        <span className="product-meta__route" dir="ltr">
          {editRoute(productId)}
        </span>
      </div>

      <div className="page-actions">
        {busy ? (
          <button type="button" className="btn btn--secondary" disabled>
            انصراف
          </button>
        ) : (
          <Link className="btn btn--secondary" href="/">
            انصراف
          </Link>
        )}
        <button
          type="button"
          className={`btn btn--secondary${savingDraft ? " is-loading" : ""}`}
          disabled={busy}
          onClick={() => void handleSave("draft", "draft")}
        >
          {savingDraft ? <span className="btn__spinner" aria-hidden="true" /> : null}
          ذخیره پیش‌نویس
        </button>
        <button
          type="button"
          className={`btn btn--primary${savingPrimary ? " is-loading" : ""}`}
          disabled={busy}
          aria-busy={savingPrimary}
          onClick={() => void handleSave(form.values.status, "save")}
        >
          {savingPrimary ? <span className="btn__spinner" aria-hidden="true" /> : null}
          {savingPrimary ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </button>
      </div>

      <ProductFormFields
        values={form.values}
        errors={form.errors}
        collections={form.collections}
        selectedSizes={form.selectedSizes}
        onNameChange={form.handleNameChange}
        onPriceChange={form.handlePriceChange}
        onPatch={form.patch}
        onPatchSpecs={form.patchSpecs}
        onGenerateSlug={form.generateSlug}
        onToggleSize={form.toggleSize}
        onAddFiles={form.addFiles}
        onMoveImage={form.moveImage}
        onRemoveImage={form.removeImage}
      />

      {form.toast ? (
        <div className="toast toast--success" role="status">
          <CheckIcon />
          <span>{form.toast}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="بستن"
            onClick={() => form.setToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
