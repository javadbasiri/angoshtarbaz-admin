"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formValuesToPayload } from "@/lib/product-map";
import { formatTomanInput, parseTomanInput, slugifyName } from "@/lib/format";
import { SAMPLE_PRODUCT } from "@/lib/product-sample";
import { FALLBACK_COLLECTIONS, type CollectionOption } from "@/types/collection";
import {
  type CreateProductRequest,
  type GalleryImage,
  type ProductFormValues,
  type ProductStatus,
} from "@/types/product";

export type FieldErrors = Partial<Record<"name" | "priceToman" | "collectionId" | "sizes", string>>;

export type FormAlert =
  | { kind: "error"; title: string; body: string }
  | { kind: "success"; title: string; body: string }
  | { kind: "info"; title: string; body: string }
  | null;

function newImageId() {
  return `img-${Math.random().toString(36).slice(2, 10)}`;
}

function parseCollections(
  payload: { collections?: CollectionOption[] } | CollectionOption[],
): CollectionOption[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.collections)
      ? payload.collections
      : [];
  return list;
}

export function useProductForm({
  initial,
  collections: collectionsProp,
  skipCollectionFetch = false,
}: {
  initial: ProductFormValues;
  collections?: CollectionOption[];
  skipCollectionFetch?: boolean;
}) {
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [collections, setCollections] = useState<CollectionOption[]>(
    collectionsProp && collectionsProp.length > 0 ? collectionsProp : FALLBACK_COLLECTIONS,
  );
  const [bootstrapping, setBootstrapping] = useState(!skipCollectionFetch);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<FormAlert>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<ProductStatus | "save" | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (skipCollectionFetch) return;
    let cancelled = false;
    async function load() {
      try {
        const payload = await apiFetch<{ collections?: CollectionOption[] } | CollectionOption[]>(
          { path: "/api/collections" },
        );
        const list = parseCollections(payload);
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
  }, [skipCollectionFetch]);

  const selectedSizes = useMemo(() => new Set(values.sizes), [values.sizes]);

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

  function handlePriceChange(raw: string) {
    patch({ priceToman: formatTomanInput(raw) });
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
        // Upload is optional; create/update still proceeds without image ids.
      }
    }

    return { imageIds, urls };
  }

  function checkValidity(): boolean {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setAlert({
        kind: "error",
        title: "لطفاً خطاهای فرم را برطرف کنید",
        body: `${Object.keys(nextErrors).length} فیلد الزامی ناقص یا نامعتبر است.`,
      });
      return false;
    }
    return true;
  }

  async function buildPayload(status: ProductStatus): Promise<CreateProductRequest | null> {
    if (!checkValidity()) return null;
    const gallery = await uploadGallery();
    return formValuesToPayload(values, status, gallery);
  }

  return {
    values,
    setValues,
    collections,
    bootstrapping,
    errors,
    alert,
    setAlert,
    toast,
    setToast,
    submitting,
    setSubmitting,
    selectedSizes,
    patch,
    patchSpecs,
    handleNameChange,
    handlePriceChange,
    generateSlug,
    toggleSize,
    addFiles,
    moveImage,
    removeImage,
    buildPayload,
    checkValidity,
  };
}
