"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertIcon, CheckIcon, GalleryIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/admin/icons";
import { MediaThumb } from "@/components/gallery/media-thumb";
import { apiFetch, ApiError } from "@/lib/api";
import { formatFileSize, formatGalleryCount, isAllowedGalleryFile } from "@/lib/gallery";
import { uploadFileToGallery } from "@/lib/gallery-upload";
import { toPersianDigits } from "@/lib/format";
import type { GalleryAsset } from "@/types/gallery";

type UploadTile = {
  localId: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "uploading" | "error";
  error: string;
};

function newLocalId() {
  return `up-${Math.random().toString(36).slice(2, 10)}`;
}

function extractList(payload: unknown): GalleryAsset[] {
  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: GalleryAsset[] }).items;
  }
  return [];
}

export function GalleryLibrary() {
  const [items, setItems] = useState<GalleryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadTile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [banner, setBanner] = useState<{ kind: "error" | "success"; title: string; body: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async () => {
    setLoadError(null);
    try {
      const payload = await apiFetch<unknown>({ path: "/api/gallery?limit=100" });
      setItems(extractList(payload));
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "اتصال به سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const images = items.filter((item) => item.kind === "image").length;
  const videos = items.filter((item) => item.kind === "video").length;
  const uploading = uploads.filter((item) => item.status === "uploading").length;
  const failed = uploads.filter((item) => item.status === "error").length;
  const empty = !loading && !loadError && items.length === 0 && uploads.length === 0;
  const showSelectBar = selectMode || selected.length > 0;

  const countLabel = useMemo(() => {
    if (loading) return "";
    if (empty) return "۰ فایل";
    return formatGalleryCount({
      total: items.length,
      images,
      videos,
      uploading,
      failed,
    });
  }, [empty, failed, images, items.length, loading, uploading, videos]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function toggleSelect(id: string) {
    setSelectMode(true);
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function selectAll() {
    setSelectMode(true);
    setSelected(items.map((item) => item.id));
  }

  function clearSelection() {
    setSelected([]);
    setSelectMode(false);
  }

  async function deleteIds(ids: string[]) {
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      ids.length === 1 ? "این فایل از کتابخانه حذف می‌شود. ادامه می‌دهید؟" : `${toPersianDigits(ids.length)} فایل حذف می‌شوند. ادامه می‌دهید؟`,
    );
    if (!confirmed) return;
    setBusyDelete(true);
    const remaining: string[] = [];
    for (const id of ids) {
      try {
        await apiFetch({ path: `/api/gallery/${encodeURIComponent(id)}`, method: "DELETE" });
      } catch {
        remaining.push(id);
      }
    }
    setItems((current) => current.filter((item) => !ids.includes(item.id) || remaining.includes(item.id)));
    setSelected((current) => current.filter((id) => remaining.includes(id)));
    if (remaining.length) {
      setBanner({
        kind: "error",
        title: "حذف ناقص بود",
        body: `${toPersianDigits(remaining.length)} فایل حذف نشد. دوباره تلاش کنید.`,
      });
    } else {
      setToast(ids.length === 1 ? "فایل حذف شد" : "فایل‌های انتخاب‌شده حذف شدند");
      setBanner(null);
      if (selected.length === ids.length) setSelectMode(false);
    }
    setBusyDelete(false);
  }

  async function runUpload(tile: UploadTile) {
    try {
      const asset = await uploadFileToGallery(tile.file, (progress) => {
        setUploads((current) =>
          current.map((item) => (item.localId === tile.localId ? { ...item, progress, status: "uploading" } : item)),
        );
      });
      setUploads((current) => current.filter((item) => item.localId !== tile.localId));
      URL.revokeObjectURL(tile.previewUrl);
      setItems((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
    } catch (error) {
      setUploads((current) =>
        current.map((item) =>
          item.localId === tile.localId
            ? {
                ...item,
                status: "error",
                error: error instanceof ApiError ? error.message : "آپلود ناموفق بود.",
              }
            : item,
        ),
      );
    }
  }

  function queueFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const next: UploadTile[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      const allowed = isAllowedGalleryFile(file);
      const localId = newLocalId();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      if (!allowed.ok) {
        next.push({
          localId,
          file,
          previewUrl,
          progress: 0,
          status: "error",
          error: allowed.message,
        });
        rejected.push(file.name);
        continue;
      }
      next.push({
        localId,
        file,
        previewUrl,
        progress: 4,
        status: "uploading",
        error: "",
      });
    }
    if (next.length === 0) return;
    setUploads((current) => [...next, ...current]);
    if (rejected.length) {
      setBanner({
        kind: "error",
        title: "آپلود ناموفق",
        body: `${toPersianDigits(rejected.length)} فایل بارگذاری نشدند: حجم بیش از حد مجاز یا قالب پشتیبانی‌نشده. لطفاً JPG/PNG/WebP تا ۱۲ مگابایت یا MP4 تا ۵۰ مگابایت ارسال کنید.`,
      });
    } else {
      setBanner(null);
    }
    for (const tile of next) {
      if (tile.status === "uploading") void runUpload(tile);
    }
  }

  function retryUpload(localId: string) {
    const tile = uploads.find((item) => item.localId === localId);
    if (!tile) return;
    const allowed = isAllowedGalleryFile(tile.file);
    if (!allowed.ok) return;
    setUploads((current) =>
      current.map((item) => (item.localId === localId ? { ...item, status: "uploading", progress: 4, error: "" } : item)),
    );
    void runUpload({ ...tile, status: "uploading", progress: 4, error: "" });
  }

  function dismissUpload(localId: string) {
    const tile = uploads.find((item) => item.localId === localId);
    if (tile?.previewUrl) URL.revokeObjectURL(tile.previewUrl);
    setUploads((current) => current.filter((item) => item.localId !== localId));
  }

  function retryFailed() {
    uploads.filter((item) => item.status === "error").forEach((item) => retryUpload(item.localId));
  }

  if (loading) {
    return <GallerySkeleton />;
  }

  return (
    <div className="media-page">
      <p className="media-route">/gallery · /admin/gallery</p>

      {banner ? (
        <div className={`alert alert--${banner.kind}`} role={banner.kind === "error" ? "alert" : "status"}>
          <span className="alert__icon">{banner.kind === "error" ? <AlertIcon /> : <CheckIcon />}</span>
          <div>
            <p className="alert__title">{banner.title}</p>
            <p className="alert__body">{banner.body}</p>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="alert alert--error" role="alert">
          <span className="alert__icon">
            <AlertIcon />
          </span>
          <div>
            <p className="alert__title">بارگذاری گالری ناموفق بود</p>
            <p className="alert__body">{loadError}</p>
          </div>
        </div>
      ) : null}

      <div className="media-toolbar">
        <div className="media-toolbar__meta">
          <strong style={{ fontSize: "var(--font-size-16)" }}>کتابخانه رسانه</strong>
          <span className="media-toolbar__count">{countLabel}</span>
        </div>
        <div className="media-toolbar__actions">
          {failed > 0 ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={retryFailed}>
              تلاش مجدد برای ناموفق‌ها
            </button>
          ) : null}
          {!empty && !loadError ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              aria-pressed={selectMode}
              onClick={() => (selectMode ? clearSelection() : setSelectMode(true))}
            >
              حالت انتخاب
            </button>
          ) : null}
          {loadError ? (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setLoading(true);
                void loadGallery();
              }}
            >
              تلاش مجدد
            </button>
          ) : null}
          <button type="button" className="btn btn--primary btn--sm" onClick={openFilePicker}>
            <PlusIcon />
            آپلود فایل
          </button>
        </div>
      </div>

      {showSelectBar && !loadError ? (
        <div className="select-bar" role="status">
          <span className="select-bar__count">{toPersianDigits(selected.length)} مورد انتخاب شده</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={selectAll}>
            انتخاب همه
          </button>
          <button type="button" className="btn btn--secondary btn--sm" onClick={clearSelection}>
            لغو انتخاب
          </button>
          <span className="select-bar__spacer" />
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={selected.length === 0 || busyDelete}
            onClick={() => void deleteIds(selected)}
          >
            حذف دسته‌ای
          </button>
        </div>
      ) : null}

      {loadError ? null : empty ? (
        <div
          className={`dropzone${dragOver ? " is-dragover" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="ناحیه آپلود چندفایلی"
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            queueFiles(event.dataTransfer.files);
          }}
        >
          <div className="dropzone__icon" aria-hidden="true">
            <UploadIcon />
          </div>
          <div className="dropzone__title">هنوز فایلی در گالری نیست</div>
          <div className="dropzone__hint">
            تصاویر و ویدیوهای جواهرات را اینجا رها کنید یا از دکمه زیر انتخاب کنید. فایل‌ها برای همه محصولات قابل
            استفاده خواهند بود.
          </div>
          <div className="dropzone__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
            >
              انتخاب فایل‌ها
            </button>
          </div>
        </div>
      ) : loadError ? null : (
        <div
          className={`dropzone dropzone--compact${dragOver ? " is-dragover" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="ناحیه آپلود چندفایلی"
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            queueFiles(event.dataTransfer.files);
          }}
        >
          <div className="dropzone__copy">
            <div className="dropzone__icon" aria-hidden="true">
              <UploadIcon />
            </div>
            <div>
              <div className="dropzone__title">فایل‌ها را اینجا رها کنید یا انتخاب کنید</div>
              <div className="dropzone__hint">JPG، PNG، WebP، MP4 · حداکثر ۱۲ مگابایت برای تصویر · چندفایلی</div>
            </div>
          </div>
          <div className="dropzone__actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
            >
              انتخاب فایل‌ها
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,.jpg,.jpeg,.png,.webp,.mp4"
        multiple
        onChange={(event) => {
          queueFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {empty ? (
        <div className="media-empty" aria-live="polite">
          <div className="media-empty__icon" aria-hidden="true">
            <GalleryIcon />
          </div>
          <h2 className="media-empty__title">گالری خالی است</h2>
          <p className="media-empty__body">
            پس از آپلود، می‌توانید از همین کتابخانه در فرم افزودن/ویرایش محصول با «انتخاب از گالری» استفاده کنید.
          </p>
          <Link className="btn btn--secondary btn--sm" href="/products/new">
            نمایش جریان انتخاب برای محصول
          </Link>
        </div>
      ) : null}

      {!loadError && (items.length > 0 || uploads.length > 0) ? (
        <div className="media-grid" role="list" aria-label="فایل‌های گالری">
          {uploads.map((tile) => (
            <article
              key={tile.localId}
              className={`media-tile ${tile.status === "error" ? "is-error" : "is-uploading"}`}
              role="listitem"
              aria-busy={tile.status === "uploading"}
            >
              <MediaThumb
                id={tile.localId}
                url={tile.previewUrl}
                kind={tile.file.type.startsWith("video/") ? "video" : "image"}
                label={tile.status === "error" ? "فایل نامعتبر" : tile.file.name}
              />
              <div className="media-tile__progress">
                {tile.status === "uploading" ? (
                  <>
                    <span className="media-tile__progress-label">
                      در حال آپلود… {toPersianDigits(tile.progress)}٪
                    </span>
                    <div className="progress-bar" role="progressbar" aria-valuenow={tile.progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="progress-bar__fill" style={{ width: `${tile.progress}%` }} />
                    </div>
                  </>
                ) : (
                  <>
                    <span className="media-tile__error-msg">{tile.error}</span>
                    {isAllowedGalleryFile(tile.file).ok ? (
                      <button type="button" className="btn btn--secondary btn--sm" style={{ marginTop: 4 }} onClick={() => retryUpload(tile.localId)}>
                        تلاش مجدد
                      </button>
                    ) : (
                      <button type="button" className="btn btn--secondary btn--sm" style={{ marginTop: 4 }} onClick={() => dismissUpload(tile.localId)}>
                        حذف
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}

          {items.map((item, index) => {
            const isSelected = selected.includes(item.id);
            return (
              <article key={item.id} className={`media-tile${isSelected ? " is-selected" : ""}`} role="listitem">
                <input
                  className="media-tile__check"
                  type="checkbox"
                  checked={isSelected}
                  aria-label={`انتخاب ${item.filename}`}
                  onChange={() => toggleSelect(item.id)}
                />
                <MediaThumb
                  id={item.id}
                  url={item.publicUrl}
                  kind={item.kind}
                  label={item.kind === "video" ? "ویدیو چرخش" : `تصویر ${toPersianDigits(index + 1)}`}
                />
                {item.kind === "video" ? (
                  <span className="media-tile__badge media-tile__badge--video">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    ویدیو
                  </span>
                ) : null}
                <div className="media-tile__meta">
                  <span className="media-tile__name">{item.filename}</span>
                  <span className="media-tile__size">{formatFileSize(item.size)}</span>
                </div>
                <div className="media-tile__actions">
                  <button
                    type="button"
                    className="media-tile__btn"
                    aria-label={`حذف ${item.filename}`}
                    onClick={() => void deleteIds([item.id])}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {toast ? (
        <div className="toast toast--success" role="status">
          <CheckIcon />
          <span>{toast}</span>
          <button type="button" className="toast__close" aria-label="بستن" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="media-page" aria-busy="true" aria-label="در حال بارگذاری گالری">
      <p className="media-route">/gallery · /admin/gallery</p>
      <div className="media-toolbar">
        <div className="media-toolbar__meta">
          <div className="sk sk--title" style={{ width: 160, height: 18 }} />
          <div className="sk sk--text" style={{ width: 220, marginTop: 8 }} />
        </div>
        <div className="media-toolbar__actions">
          <span className="sk sk--btn" style={{ width: 100 }} />
          <span className="sk sk--btn" style={{ width: 110 }} />
        </div>
      </div>
      <div className="sk" style={{ height: 72, borderRadius: 16, width: "100%" }} />
      <div className="media-grid">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="media-tile media-tile--skeleton" aria-hidden="true">
            <div className="sk sk--media" />
          </div>
        ))}
      </div>
    </div>
  );
}
