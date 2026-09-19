"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertIcon, CheckIcon, PlusIcon, RingPlaceholder } from "@/components/admin/icons";
import { ProductFormSkeleton } from "@/components/product/product-skeleton";
import { apiFetch, ApiError } from "@/lib/api";
import {
  formatTomanDisplay,
  formatTomanInput,
  parseTomanInput,
  slugifyName,
  tomanToIrr,
} from "@/lib/format";
import { buildPreviewMeta, SAMPLE_PRODUCT, sampleProductFormValues } from "@/lib/product-sample";
import { FALLBACK_COLLECTIONS, type CollectionOption } from "@/types/collection";
import {
  emptyProductFormValues,
  RING_SIZE_OPTIONS,
  type CreateProductRequest,
  type CreatedProduct,
  type GalleryImage,
  type ProductFormValues,
  type ProductStatus,
} from "@/types/product";

type FieldErrors = Partial<Record<"name" | "priceToman" | "collectionId" | "sizes", string>>;

type FormAlert =
  | { kind: "error"; title: string; body: string }
  | { kind: "success"; title: string; body: string }
  | null;

const GALLERY_LABELS = ["اصلی", "جانبی", "جزئیات"] as const;

function galleryLabel(index: number) {
  return GALLERY_LABELS[index] ?? `تصویر ${index + 1}`;
}

function newImageId() {
  return `img-${Math.random().toString(36).slice(2, 10)}`;
}

export function ProductForm({ prefillSample = false }: { prefillSample?: boolean }) {
  const [values, setValues] = useState<ProductFormValues>(
    prefillSample ? sampleProductFormValues() : emptyProductFormValues,
  );
  const [collections, setCollections] = useState<CollectionOption[]>(FALLBACK_COLLECTIONS);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<FormAlert>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<ProductStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await apiFetch<{ collections?: CollectionOption[] } | CollectionOption[]>(
          { path: "/api/collections" },
        );
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.collections)
            ? payload.collections
            : [];
        if (!cancelled && list.length > 0) {
          setCollections(list);
          setValues((current) => {
            if (current.collectionId === SAMPLE_PRODUCT.collectionId) {
              const match =
                list.find((item) => item.id === SAMPLE_PRODUCT.collectionId) ??
                list.find((item) => item.name.includes("سولیتر"));
              return match ? { ...current, collectionId: match.id } : current;
            }
            return current;
          });
        }
      } catch {
        if (!cancelled) setCollections(FALLBACK_COLLECTIONS);
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedSizes = useMemo(() => new Set(values.sizes), [values.sizes]);
  const previewMeta = buildPreviewMeta(values.specs, {
    description: values.description,
  });
  const previewPrice = parseTomanInput(values.priceToman);
  const previewImage = values.gallery[0]?.url;

  function clearError(key: keyof FieldErrors) {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function patch(next: Partial<ProductFormValues>) {
    if (next.name !== undefined) clearError("name");
    if (next.priceToman !== undefined) clearError("priceToman");
    if (next.collectionId !== undefined) clearError("collectionId");
    setValues((current) => ({ ...current, ...next }));
  }

  function patchSpecs(next: Partial<ProductFormValues["specs"]>) {
    setValues((current) => ({
      ...current,
      specs: { ...current.specs, ...next },
    }));
  }

  function handleNameChange(name: string) {
    const next: Partial<ProductFormValues> = { name };
    if (!values.slugManual) {
      next.slug = slugifyName(name);
    }
    patch(next);
  }

  function generateSlug() {
    const slug = slugifyName(values.name) || SAMPLE_PRODUCT.slug;
    patch({ slug, slugManual: true });
  }

  function toggleSize(size: string) {
    patch({
      sizes: selectedSizes.has(size)
        ? values.sizes.filter((item) => item !== size)
        : [...values.sizes, size],
    });
  }

  function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    const added: GalleryImage[] = files.map((file) => ({
      id: newImageId(),
      url: URL.createObjectURL(file),
      name: file.name,
      file,
    }));
    patch({ gallery: [...values.gallery, ...added] });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const next = [...values.gallery];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    patch({ gallery: next });
  }

  function removeImage(index: number) {
    const next = [...values.gallery];
    const [removed] = next.splice(index, 1);
    if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
    patch({ gallery: next });
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!values.name.trim()) next.name = "نام محصول الزامی است.";
    const toman = parseTomanInput(values.priceToman);
    if (toman === null || toman === 0) next.priceToman = "قیمت باید عدد معتبر به تومان باشد.";
    if (!values.collectionId) next.collectionId = "انتخاب کالکشن الزامی است.";
    return next;
  }

  async function uploadGallery(): Promise<{ imageIds: string[]; urls: string[] }> {
    const imageIds: string[] = [];
    const urls: string[] = [];

    for (const image of values.gallery) {
      if (image.remoteId) {
        imageIds.push(image.remoteId);
        continue;
      }
      if (!image.file) {
        if (image.url && !image.url.startsWith("blob:")) urls.push(image.url);
        continue;
      }
      const body = new FormData();
      body.append("file", image.file);
      try {
        const uploaded = await apiFetch<{ id?: string; url?: string }>({
          path: "/api/uploads",
          method: "POST",
          body,
        });
        if (uploaded.id) imageIds.push(uploaded.id);
        if (uploaded.url) urls.push(uploaded.url);
      } catch {
        // Upload is optional; product create still proceeds without image ids.
      }
    }

    return { imageIds, urls };
  }

  async function handleSubmit(status: ProductStatus) {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setAlert({
        kind: "error",
        title: "لطفاً خطاهای فرم را برطرف کنید",
        body: `${Object.keys(nextErrors).length} فیلد الزامی ناقص یا نامعتبر است.`,
      });
      return;
    }

    const toman = parseTomanInput(values.priceToman);
    if (toman === null) return;

    setSubmitting(status);
    setAlert(null);

    try {
      const { imageIds, urls } = await uploadGallery();
      const payload: CreateProductRequest = {
        name: values.name.trim(),
        description: values.description.trim(),
        // UI تومان → API IRR (×10). See TOMAN_TO_IRR in lib/format.ts.
        price: tomanToIrr(toman),
        collectionId: values.collectionId,
        status,
        sizes: values.sizes.map((size) => Number(size)).filter((size) => Number.isFinite(size)),
        specs: { ...values.specs },
      };
      const slug = values.slug.trim();
      if (slug) payload.slug = slug;
      if (imageIds.length) payload.imageIds = imageIds;
      if (urls.length) payload.urls = urls;
      const stock = Number(values.stock);
      if (Number.isFinite(stock)) payload.stock = stock;

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

      const productName = confirmed.name || values.name;
      setValues((current) => ({ ...current, status }));
      if (status === "published") {
        setAlert({
          kind: "success",
          title: "محصول با موفقیت منتشر شد",
          body: `${productName} هم‌اکنون در فروشگاه قابل مشاهده است.`,
        });
        setToast("انتشار انجام شد");
      } else {
        setAlert({
          kind: "success",
          title: "پیش‌نویس ذخیره شد",
          body: `${productName} فقط در ادمین قابل مشاهده است.`,
        });
        setToast("پیش‌نویس ذخیره شد");
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "ثبت محصول با خطا روبه‌رو شد.";
      setAlert({
        kind: "error",
        title: "ثبت محصول انجام نشد",
        body: message,
      });
    } finally {
      setSubmitting(null);
    }
  }

  if (bootstrapping) {
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

  const busy = submitting !== null;

  return (
    <>
      {alert ? (
        <div className={`alert alert--${alert.kind}`} role={alert.kind === "error" ? "alert" : "status"}>
          <span className="alert__icon">{alert.kind === "error" ? <AlertIcon /> : <CheckIcon />}</span>
          <div>
            <p className="alert__title">{alert.title}</p>
            <p className="alert__body">{alert.body}</p>
          </div>
        </div>
      ) : null}

      <div className="page-actions">
        <button
          type="button"
          className={`btn btn--secondary${submitting === "draft" ? " is-loading" : ""}`}
          disabled={busy}
          onClick={() => void handleSubmit("draft")}
        >
          {submitting === "draft" ? <span className="btn__spinner" aria-hidden="true" /> : null}
          ذخیره پیش‌نویس
        </button>
        <button
          type="button"
          className={`btn btn--primary${submitting === "published" ? " is-loading" : ""}`}
          disabled={busy}
          onClick={() => void handleSubmit("published")}
        >
          {submitting === "published" ? <span className="btn__spinner" aria-hidden="true" /> : null}
          انتشار
        </button>
      </div>

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
                  onChange={(event) => handleNameChange(event.target.value)}
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
                    onChange={(event) =>
                      patch({ slug: event.target.value, slugManual: true })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  style={{ marginTop: 28 }}
                  onClick={generateSlug}
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
                  onChange={(event) => patch({ description: event.target.value })}
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
                      onChange={(event) => patch({ priceToman: formatTomanInput(event.target.value) })}
                    />
                    <span className="input-affix__suffix">تومان</span>
                  </div>
                  <p className="field__error" id="price-err">
                    {errors.priceToman}
                  </p>
                  <p className="field__hint">در API به ریال ارسال می‌شود (تومان × ۱۰).</p>
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
                    onChange={(event) => patch({ collectionId: event.target.value })}
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
                  onChange={(event) => patch({ stock: event.target.value })}
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
                      onChange={() => patch({ status: "draft" })}
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
                      onChange={() => patch({ status: "published" })}
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
                      onClick={() => toggleSize(size)}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {values.sizes.length === 0 ? (
                <p className="field__hint" style={{ marginTop: 8 }}>
                  حداقل یک سایز پیشنهاد می‌شود.
                </p>
              ) : null}
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
                  onChange={(event) => patchSpecs({ weight: event.target.value })}
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
                  onChange={(event) => patchSpecs({ karat: event.target.value })}
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
                  onChange={(event) => patchSpecs({ gem: event.target.value })}
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
                  onChange={(event) => patchSpecs({ cut: event.target.value })}
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
                  onChange={(event) => patchSpecs({ band: event.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">گالری تصاویر</h2>
              <span className="panel__hint">چند تصویر · ترتیب با جابه‌جایی</span>
            </div>
            <div className="panel__body">
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  addFiles(event.target.files);
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
                        onClick={() => moveImage(index, -1)}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className="gallery-item__btn"
                        aria-label="جابه‌جایی به بعد"
                        onClick={() => moveImage(index, 1)}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="gallery-item__btn"
                        aria-label="حذف تصویر"
                        onClick={() => removeImage(index)}
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
                تصویر اول به‌عنوان تصویر اصلی کارت محصول استفاده می‌شود.
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
                    {previewMeta ||
                      (values.name.trim()
                        ? "مشخصات نمایشی پس از پر کردن فرم"
                        : "مشخصات نمایشی پس از پر کردن فرم")}
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
      </div>

      {toast ? (
        <div className="toast toast--success" role="status">
          <CheckIcon />
          <span>{toast}</span>
          <button type="button" className="toast__close" aria-label="بستن" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
