"use client";

import { useMemo, useState } from "react";
import {
  COLLECTION_OPTIONS,
  RING_SIZE_OPTIONS,
  emptyProductFormValues,
  type ProductFormValues,
  type ProductStatus,
} from "@/types/product";

type ProductFormProps = {
  initialValues?: ProductFormValues;
};

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-primary">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const inputClassName =
  "w-full rounded-md border border-secondary bg-white px-3 py-2 text-sm outline-none focus:border-primary";

export function ProductForm({ initialValues }: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(
    initialValues ?? emptyProductFormValues,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const selectedSizes = useMemo(() => new Set(values.sizes), [values.sizes]);

  function patch(next: Partial<ProductFormValues>) {
    setValues((current) => ({ ...current, ...next }));
  }

  function patchSpecs(next: Partial<ProductFormValues["specs"]>) {
    setValues((current) => ({
      ...current,
      specs: { ...current.specs, ...next },
    }));
  }

  function toggleSize(size: string) {
    patch({
      sizes: selectedSizes.has(size)
        ? values.sizes.filter((item) => item !== size)
        : [...values.sizes, size],
    });
  }

  function handleGalleryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).map((file) => file.name);
    patch({ gallery: files });
  }

  function handleSubmit(status: ProductStatus) {
    setNotice(
      status === "published"
        ? "انتشار فعلاً به بک‌اند وصل نیست (ANG-A1)."
        : "ذخیره پیش‌نویس فعلاً به بک‌اند وصل نیست (ANG-A1).",
    );
    patch({ status });
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(values.status);
      }}
    >
      <div className="space-y-6">
        <section className="space-y-4 rounded-lg border border-secondary bg-white p-5">
          <h2 className="text-sm font-semibold text-primary">اطلاعات محصول</h2>
          <Field id="name" label="نام">
            <input
              id="name"
              name="name"
              className={inputClassName}
              value={values.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="مثلاً انگشتر یاقوت کلاسیک"
            />
          </Field>
          <Field id="slug" label="نامک (slug)" hint="برای URL فروشگاه؛ انگلیسی و خط تیره">
            <input
              id="slug"
              name="slug"
              dir="ltr"
              className={`${inputClassName} text-left`}
              value={values.slug}
              onChange={(event) => patch({ slug: event.target.value })}
              placeholder="classic-ruby-ring"
            />
          </Field>
          <Field id="description" label="توضیحات">
            <textarea
              id="description"
              name="description"
              rows={5}
              className={inputClassName}
              value={values.description}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="price" label="قیمت">
              <input
                id="price"
                name="price"
                inputMode="numeric"
                dir="ltr"
                className={`${inputClassName} text-left`}
                value={values.price}
                onChange={(event) => patch({ price: event.target.value })}
                placeholder="0"
              />
            </Field>
            <Field id="collection" label="کالکشن">
              <select
                id="collection"
                name="collection"
                className={inputClassName}
                value={values.collection}
                onChange={(event) => patch({ collection: event.target.value })}
              >
                {COLLECTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-secondary bg-white p-5">
          <h2 className="text-sm font-semibold text-primary">سایزها</h2>
          <div className="flex flex-wrap gap-2">
            {RING_SIZE_OPTIONS.map((size) => {
              const active = selectedSizes.has(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    active
                      ? "border-primary bg-primary text-canvas"
                      : "border-secondary bg-canvas text-foreground"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-secondary bg-white p-5">
          <h2 className="text-sm font-semibold text-primary">مشخصات</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="spec-weight" label="وزن">
              <input
                id="spec-weight"
                name="specs.weight"
                className={inputClassName}
                value={values.specs.weight}
                onChange={(event) => patchSpecs({ weight: event.target.value })}
                placeholder="گرم"
              />
            </Field>
            <Field id="spec-karat" label="عیار">
              <input
                id="spec-karat"
                name="specs.karat"
                className={inputClassName}
                value={values.specs.karat}
                onChange={(event) => patchSpecs({ karat: event.target.value })}
                placeholder="۱۸"
              />
            </Field>
            <Field id="spec-gem" label="نگین">
              <input
                id="spec-gem"
                name="specs.gem"
                className={inputClassName}
                value={values.specs.gem}
                onChange={(event) => patchSpecs({ gem: event.target.value })}
              />
            </Field>
            <Field id="spec-cut" label="تراش">
              <input
                id="spec-cut"
                name="specs.cut"
                className={inputClassName}
                value={values.specs.cut}
                onChange={(event) => patchSpecs({ cut: event.target.value })}
              />
            </Field>
            <Field id="spec-band" label="حلقه">
              <input
                id="spec-band"
                name="specs.band"
                className={inputClassName}
                value={values.specs.band}
                onChange={(event) => patchSpecs({ band: event.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-secondary bg-white p-5">
          <h2 className="text-sm font-semibold text-primary">گالری</h2>
          <Field id="gallery" label="تصاویر" hint="آپلود واقعی در ANG-A1 به بک‌اند وصل می‌شود.">
            <input
              id="gallery"
              name="gallery"
              type="file"
              accept="image/*"
              multiple
              className={`${inputClassName} file:ml-3 file:border-0 file:bg-transparent file:text-sm`}
              onChange={handleGalleryChange}
            />
          </Field>
          {values.gallery.length > 0 ? (
            <ul className="list-disc pr-5 text-sm text-muted">
              {values.gallery.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="space-y-4 rounded-lg border border-secondary bg-white p-5">
          <h2 className="text-sm font-semibold text-primary">وضعیت</h2>
          <Field id="status" label="وضعیت انتشار">
            <select
              id="status"
              name="status"
              className={inputClassName}
              value={values.status}
              onChange={(event) =>
                patch({ status: event.target.value as ProductStatus })
              }
            >
              <option value="draft">پیش‌نویس</option>
              <option value="published">منتشر شده</option>
            </select>
          </Field>
          {notice ? (
            <p className="rounded-md bg-canvas px-3 py-2 text-xs text-muted">
              {notice}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              className="rounded-md border border-secondary bg-secondary px-3 py-2 text-sm text-primary"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("published")}
              className="rounded-md bg-primary px-3 py-2 text-sm text-canvas"
            >
              انتشار
            </button>
          </div>
        </section>
      </aside>
    </form>
  );
}
