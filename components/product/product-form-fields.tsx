"use client";

import { useRef, useState } from "react";
import { PlusIcon, RingPlaceholder } from "@/components/admin/icons";
import { GalleryPickerModal } from "@/components/gallery/gallery-picker-modal";
import { formatTomanDisplay, parseTomanInput } from "@/lib/format";
import { buildPreviewMeta } from "@/lib/product-sample";
import type { CollectionOption } from "@/types/collection";
import type { GalleryAsset } from "@/types/gallery";
import { RING_SIZE_OPTIONS, type ProductFormValues } from "@/types/product";
import type { FieldErrors } from "@/components/product/use-product-form";

const GALLERY_LABELS = ["اصلی", "جانبی", "جزئیات"] as const;

function galleryLabel(index: number) {
  return GALLERY_LABELS[index] ?? `تصویر ${index + 1}`;
}

export function ProductFormFields({
  values,
  errors,
  collections,
  selectedSizes,
  onNameChange,
  onPriceChange,
  onPatch,
  onPatchSpecs,
  onGenerateSlug,
  onToggleSize,
  onAddFiles,
  onMoveImage,
  onRemoveImage,
  onApplyGallerySelection,
}: {
  values: ProductFormValues;
  errors: FieldErrors;
  collections: CollectionOption[];
  selectedSizes: Set<string>;
  onNameChange: (name: string) => void;
  onPriceChange: (raw: string) => void;
  onPatch: (next: Partial<ProductFormValues>) => void;
  onPatchSpecs: (next: Partial<ProductFormValues["specs"]>) => void;
  onGenerateSlug: () => void;
  onToggleSize: (size: string) => void;
  onAddFiles: (files: FileList | null) => void;
  onMoveImage: (index: number, direction: -1 | 1) => void;
  onRemoveImage: (index: number) => void;
  onApplyGallerySelection: (assets: GalleryAsset[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const previewMeta = buildPreviewMeta(values.specs, { description: values.description });
  const previewPrice = parseTomanInput(values.priceToman);
  const previewImage = values.gallery[0]?.url;

  return (
    <div className="add-product">
      <div className="add-product__main">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">اطلاعات پایه</h2>
            <span className="panel__hint">نام، اسلاگ و توضیحات</span>
          </div>
          <div className="panel__body form-grid">
            <div className={`field${errors.name ? " is-invalid" : ""}`}>
              <label className="field__label" htmlFor="name">
                نام <span className="req">*</span>
              </label>
              <input
                className="input"
                id="name"
                name="name"
                type="text"
                placeholder="مثلاً انگشتر سولیتر الماس"
                value={values.name}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-err" : undefined}
                onChange={(event) => onNameChange(event.target.value)}
              />
              <p className="field__error" id="name-err">
                {errors.name}
              </p>
            </div>

            <div className="slug-row">
              <div className="field" style={{ flex: 1 }}>
                <label className="field__label" htmlFor="slug">
                  اسلاگ{" "}
                  <span className="field__hint" style={{ display: "inline", fontWeight: 400 }}>
                    (اختیاری · خودکار از نام)
                  </span>
                </label>
                <input
                  className="input"
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="auto-from-name"
                  dir="ltr"
                  style={{ textAlign: "left" }}
                  value={values.slug}
                  onChange={(event) => onPatch({ slug: event.target.value, slugManual: true })}
                />
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                style={{ marginTop: 28 }}
                onClick={onGenerateSlug}
              >
                تولید خودکار
              </button>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="desc">
                توضیحات
              </label>
              <textarea
                className="textarea"
                id="desc"
                name="desc"
                placeholder="توضیح کوتاه محصول برای صفحه جزئیات…"
                value={values.description}
                onChange={(event) => onPatch({ description: event.target.value })}
              />
            </div>

            <div className="form-grid form-grid--2">
              <div className={`field${errors.priceToman ? " is-invalid" : ""}`}>
                <label className="field__label" htmlFor="price">
                  قیمت <span className="req">*</span>
                </label>
                <div className="input-affix">
                  <input
                    className="input"
                    id="price"
                    name="price"
                    type="text"
                    inputMode="numeric"
                    placeholder="۰"
                    value={values.priceToman}
                    aria-invalid={Boolean(errors.priceToman)}
                    aria-describedby={errors.priceToman ? "price-err" : undefined}
                    onChange={(event) => onPriceChange(event.target.value)}
                  />
                  <span className="input-affix__suffix">تومان</span>
                </div>
                <p className="field__error" id="price-err">
                  {errors.priceToman}
                </p>
              </div>
              <div className={`field${errors.collectionId ? " is-invalid" : ""}`}>
                <label className="field__label" htmlFor="collection">
                  کالکشن <span className="req">*</span>
                </label>
                <select
                  className="select"
                  id="collection"
                  name="collection"
                  value={values.collectionId}
                  aria-invalid={Boolean(errors.collectionId)}
                  aria-describedby={errors.collectionId ? "col-err" : undefined}
                  onChange={(event) => onPatch({ collectionId: event.target.value })}
                >
                  <option value="">انتخاب کنید…</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
                <p className="field__error" id="col-err">
                  {errors.collectionId}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">موجودی و انتشار</h2>
          </div>
          <div className="panel__body status-row">
            <div className="field">
              <label className="field__label" htmlFor="stock">
                موجودی
              </label>
              <input
                className="input"
                id="stock"
                name="stock"
                type="number"
                min={0}
                value={values.stock}
                onChange={(event) => onPatch({ stock: event.target.value })}
              />
              <p className="field__hint">تعداد قابل فروش در انبار</p>
            </div>
            <div className="field">
              <span className="field__label">وضعیت انتشار</span>
              <div className="radio-cards" role="radiogroup" aria-label="وضعیت انتشار">
                <label className={`radio-card${values.status === "draft" ? " is-checked" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={values.status === "draft"}
                    onChange={() => onPatch({ status: "draft" })}
                  />
                  <span>
                    <span className="radio-card__title">پیش‌نویس</span>
                    <span className="radio-card__desc">فقط در ادمین قابل مشاهده</span>
                  </span>
                </label>
                <label className={`radio-card${values.status === "published" ? " is-checked" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={values.status === "published"}
                    onChange={() => onPatch({ status: "published" })}
                  />
                  <span>
                    <span className="radio-card__title">منتشر شده</span>
                    <span className="radio-card__desc">نمایش در فروشگاه</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">سایزها</h2>
            <span className="panel__hint">انتخاب چندتایی · ۵۰ تا ۵۸</span>
          </div>
          <div className="panel__body">
            <div className="size-chips" role="group" aria-label="سایزهای موجود">
              {RING_SIZE_OPTIONS.map((size) => {
                const selected = selectedSizes.has(size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={`size-chip${selected ? " is-selected" : ""}`}
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => onToggleSize(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">مشخصات</h2>
            <span className="panel__hint">وزن، عیار، نگین، تراش، رکاب</span>
          </div>
          <div className="panel__body specs-grid">
            <div className="field">
              <label className="field__label" htmlFor="weight">
                وزن
              </label>
              <input
                className="input"
                id="weight"
                name="weight"
                type="text"
                placeholder="مثلاً ۳٫۲ گرم"
                value={values.specs.weight}
                onChange={(event) => onPatchSpecs({ weight: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="karat">
                عیار
              </label>
              <input
                className="input"
                id="karat"
                name="karat"
                type="text"
                placeholder="طلای ۱۸ عیار (۷۵۰)"
                value={values.specs.karat}
                onChange={(event) => onPatchSpecs({ karat: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="gem">
                نگین
              </label>
              <input
                className="input"
                id="gem"
                name="gem"
                type="text"
                placeholder="برلیان طبیعی ۰.۸ قیراط · رنگ G · شفافیت VS1"
                value={values.specs.gem}
                onChange={(event) => onPatchSpecs({ gem: event.target.value })}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="cut">
                تراش
              </label>
              <input
                className="input"
                id="cut"
                name="cut"
                type="text"
                placeholder="مثلاً برلیان گرد"
                value={values.specs.cut}
                onChange={(event) => onPatchSpecs({ cut: event.target.value })}
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field__label" htmlFor="band">
                رکاب
              </label>
              <input
                className="input"
                id="band"
                name="band"
                type="text"
                placeholder="جنس و سبک رکاب"
                value={values.specs.band}
                onChange={(event) => onPatchSpecs({ band: event.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">گالری تصاویر</h2>
              <button type="button" className="gallery-from-library" onClick={() => setPickerOpen(true)}>
                انتخاب از گالری
              </button>
            </div>
          <div className="panel__body">
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                onAddFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <div className="gallery-grid">
              {values.gallery.map((image, index) => (
                <div key={image.id} className="gallery-item">
                  {image.url ? (
                    // Local object URLs / remote preview — not next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt={image.name} />
                  ) : (
                    <div className="gallery-item__placeholder" aria-hidden="true">
                      <RingPlaceholder size={36} />
                    </div>
                  )}
                  <span className="gallery-item__badge">{galleryLabel(index)}</span>
                  <span className="gallery-item__handle" title="جابه‌جایی" aria-label="جابه‌جایی تصویر">
                    ⠿
                  </span>
                  <div className="gallery-item__actions">
                    <button
                      type="button"
                      className="gallery-item__btn"
                      aria-label="جابه‌جایی به قبل"
                      onClick={() => onMoveImage(index, -1)}
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      className="gallery-item__btn"
                      aria-label="جابه‌جایی به بعد"
                      onClick={() => onMoveImage(index, 1)}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="gallery-item__btn"
                      aria-label="حذف تصویر"
                      onClick={() => onRemoveImage(index)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="gallery-add"
                aria-label="افزودن تصویر"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusIcon />
                <span>افزودن تصویر</span>
              </button>
            </div>
              <p className="field__hint" style={{ marginTop: 12 }}>
                تصویر اول به‌عنوان تصویر اصلی کارت محصول استفاده می‌شود. · از «انتخاب از گالری» برای پیوست از
                کتابخانه مرکزی استفاده کنید.
              </p>
            </div>
          </section>
      </div>

      <aside className="add-product__aside">
        <section className="panel preview-card-wrap">
          <div className="panel__head">
            <h2 className="panel__title">پیش‌نمایش کارت</h2>
            <span className="panel__hint">فروشگاه</span>
          </div>
          <div className="panel__body">
            <article className="product-card">
              <div className="product-card__media">
                {previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImage} alt="" />
                ) : (
                  <div className="product-card__placeholder" aria-hidden="true">
                    <RingPlaceholder />
                  </div>
                )}
              </div>
              <div className="product-card__body">
                <h3 className="product-card__title">{values.name.trim() || "نام محصول"}</h3>
                <p className="product-card__meta">
                  {previewMeta || "مشخصات نمایشی پس از پر کردن فرم"}
                </p>
                <p className="product-card__price">
                  {previewPrice !== null ? `${formatTomanDisplay(previewPrice)} تومان` : "— تومان"}
                </p>
              </div>
            </article>
            <p className="preview-note">
              {values.name.trim()
                ? "هم‌راستا با کارت فروشگاه · به‌روزرسانی زنده"
                : "کارت خالی تا زمان ورود نام و قیمت"}
            </p>
          </div>
        </section>
        </aside>

      <GalleryPickerModal
        open={pickerOpen}
        initialIds={values.gallery.map((image) => image.remoteId).filter((id): id is string => Boolean(id))}
        onClose={() => setPickerOpen(false)}
        onConfirm={(assets) => {
          onApplyGallerySelection(assets);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
