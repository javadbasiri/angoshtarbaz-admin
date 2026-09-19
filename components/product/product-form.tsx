"use client";

import { AlertIcon, CheckIcon } from "@/components/admin/icons";
import { ProductFormFields } from "@/components/product/product-form-fields";
import { ProductFormSkeleton } from "@/components/product/product-skeleton";
import { useProductForm } from "@/components/product/use-product-form";
import { apiFetch, ApiError } from "@/lib/api";
import { sampleProductFormValues } from "@/lib/product-sample";
import { emptyProductFormValues, type CreatedProduct, type ProductStatus } from "@/types/product";

export function ProductForm({ prefillSample = false }: { prefillSample?: boolean }) {
  const form = useProductForm({
    initial: prefillSample ? sampleProductFormValues() : emptyProductFormValues,
  });

  async function handleSubmit(status: ProductStatus) {
    form.setAlert(null);
    if (!form.checkValidity()) return;

    form.setSubmitting(status);
    try {
      const payload = await form.buildPayload(status);
      if (!payload) return;

      const created = await apiFetch<CreatedProduct>({
        path: "/api/products",
        method: "POST",
        body: JSON.stringify(payload),
      });

      let confirmed = created;
      if (created.id) {
        try {
          confirmed = await apiFetch<CreatedProduct>({
            path: `/api/products/${created.id}`,
          });
        } catch {
          confirmed = created;
        }
      }

      const productName = confirmed.name || form.values.name;
      form.patch({ status });
      if (status === "published") {
        form.setAlert({
          kind: "success",
          title: "محصول با موفقیت منتشر شد",
          body: `${productName} هم‌اکنون در فروشگاه قابل مشاهده است.`,
        });
        form.setToast("انتشار انجام شد");
      } else {
        form.setAlert({
          kind: "success",
          title: "پیش‌نویس ذخیره شد",
          body: `${productName} فقط در ادمین قابل مشاهده است.`,
        });
        form.setToast("پیش‌نویس ذخیره شد");
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "ثبت محصول با خطا روبه‌رو شد.";
      form.setAlert({
        kind: "error",
        title: "ثبت محصول انجام نشد",
        body: message,
      });
    } finally {
      form.setSubmitting(null);
    }
  }

  if (form.bootstrapping) {
    return (
      <>
        <div className="page-actions">
          <span className="sk sk--btn" aria-hidden="true" />
          <span className="sk sk--btn" style={{ width: 100 }} aria-hidden="true" />
        </div>
        <ProductFormSkeleton />
      </>
    );
  }

  const busy = form.submitting !== null;

  return (
    <>
      {form.alert ? (
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

      <div className="page-actions">
        <button
          type="button"
          className={`btn btn--secondary${form.submitting === "draft" ? " is-loading" : ""}`}
          disabled={busy}
          onClick={() => void handleSubmit("draft")}
        >
          {form.submitting === "draft" ? <span className="btn__spinner" aria-hidden="true" /> : null}
          ذخیره پیش‌نویس
        </button>
        <button
          type="button"
          className={`btn btn--primary${form.submitting === "published" ? " is-loading" : ""}`}
          disabled={busy}
          onClick={() => void handleSubmit("published")}
        >
          {form.submitting === "published" ? (
            <span className="btn__spinner" aria-hidden="true" />
          ) : null}
          انتشار
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
        onApplyGallerySelection={form.applyGallerySelection}
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
    </>
  );
}
