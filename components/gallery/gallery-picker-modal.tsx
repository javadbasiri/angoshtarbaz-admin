"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertIcon, CloseIcon, PersonPlaceholder, PlayPlaceholder } from "@/components/admin/icons";
import { MediaThumb } from "@/components/gallery/media-thumb";
import { apiFetch, ApiError } from "@/lib/api";
import { placeholderClass } from "@/lib/gallery";
import { toPersianDigits } from "@/lib/format";
import type { GalleryAsset, GalleryKind } from "@/types/gallery";

type Filter = "all" | "image" | "video";

function extractList(payload: unknown): GalleryAsset[] {
  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)) {
    return (payload as { items: GalleryAsset[] }).items;
  }
  return [];
}

export function GalleryPickerModal({
  open,
  initialIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initialIds: string[];
  onClose: () => void;
  onConfirm: (assets: GalleryAsset[]) => void;
}) {
  if (!open) return null;
  return (
    <GalleryPickerDialog
      key={initialIds.join("\0")}
      initialIds={initialIds}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function GalleryPickerDialog({
  initialIds,
  onClose,
  onConfirm,
}: {
  initialIds: string[];
  onClose: () => void;
  onConfirm: (assets: GalleryAsset[]) => void;
}) {
  const [items, setItems] = useState<GalleryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await apiFetch<unknown>({ path: "/api/gallery?limit=100" });
        if (!cancelled) setItems(extractList(payload));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "بارگذاری گالری ناموفق بود.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.kind === filter);
  }, [filter, items]);

  const selectedAssets = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is GalleryAsset => Boolean(item));

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setSelectedIds(next);
  }

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="pickerTitle">
      <div className="modal-backdrop" aria-hidden="true" onClick={onClose} />
      <div className="modal">
        <div className="modal__header">
          <div>
            <h2 className="modal__title" id="pickerTitle">
              انتخاب از گالری
            </h2>
            <p className="modal__subtitle">چند فایل انتخاب کنید · ترتیب گالری محصول را تنظیم کنید</p>
          </div>
          <button type="button" className="modal__close" aria-label="بستن" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal__body">
          <div className="picker-filters" role="tablist" aria-label="فیلتر نوع">
            {(
              [
                ["all", "همه"],
                ["image", "تصاویر"],
                ["video", "ویدیو"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter-chip${filter === value ? " is-active" : ""}`}
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedAssets.length > 0 ? (
            <div className="selected-strip" aria-label="انتخاب‌شده برای محصول">
              <div className="selected-strip__head">
                <span className="selected-strip__title">
                  انتخاب‌شده برای گالری محصول ({toPersianDigits(selectedAssets.length)})
                </span>
                <span className="selected-strip__hint">جابه‌جایی با دکمه‌های › ‹</span>
              </div>
              <div className="selected-strip__list">
                {selectedAssets.map((asset, index) => (
                  <div key={asset.id} className="selected-chip">
                    <SelectedChipThumb asset={asset} order={index + 1} />
                    <div className="selected-chip__controls">
                      <button
                        type="button"
                        className="selected-chip__btn"
                        aria-label="جلو"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className="selected-chip__btn"
                        aria-label="عقب"
                        disabled={index === selectedAssets.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="selected-chip__btn selected-chip__btn--remove"
                        aria-label="حذف از انتخاب"
                        onClick={() => toggle(asset.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="alert alert--error" role="alert">
              <span className="alert__icon">
                <AlertIcon />
              </span>
              <div>
                <p className="alert__title">بارگذاری گالری ناموفق بود</p>
                <p className="alert__body">{error}</p>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="picker-grid" aria-busy="true" aria-label="در حال بارگذاری">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="media-tile media-tile--skeleton" aria-hidden="true">
                  <div className="sk sk--media" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && !error && visible.length === 0 ? (
            <p className="picker-empty">گالری خالی است. ابتدا از صفحه رسانه فایل آپلود کنید.</p>
          ) : null}

          {!loading && visible.length > 0 ? (
            <div className="picker-grid" role="listbox" aria-multiselectable="true" aria-label="دارایی‌های گالری">
              {visible.map((asset, index) => {
                const order = selectedIds.indexOf(asset.id);
                const selected = order >= 0;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`picker-tile${selected ? " is-selected" : ""}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggle(asset.id)}
                  >
                    <span className="media-tile__check" aria-hidden="true" />
                    {selected ? <span className="picker-order">{toPersianDigits(order + 1)}</span> : null}
                    {asset.kind === "video" ? (
                      <span className="media-tile__badge media-tile__badge--video">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        ویدیو
                      </span>
                    ) : null}
                    <MediaThumb
                      id={asset.id}
                      url={asset.publicUrl}
                      kind={asset.kind}
                      label={asset.kind === "video" ? "ویدیو چرخش" : `تصویر ${toPersianDigits(index + 1)}`}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="modal__footer">
          <span className="modal__footer-meta">
            {toPersianDigits(selectedIds.length)} فایل انتخاب شده · تصویر اول = تصویر اصلی کارت
          </span>
          <div className="modal__footer-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              انصراف
            </button>
            <button type="button" className="btn btn--primary" onClick={() => onConfirm(selectedAssets)}>
              تأیید انتخاب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedChipThumb({ asset, order }: { asset: GalleryAsset; order: number }) {
  const kind: GalleryKind = asset.kind;
  return (
    <div className={`selected-chip__thumb ${placeholderClass(asset.id, kind)}${asset.publicUrl ? " has-media" : ""}`}>
      <span className="selected-chip__ord">{toPersianDigits(order)}</span>
      {asset.publicUrl ? (
        kind === "video" ? (
          <video src={asset.publicUrl} muted playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.publicUrl} alt="" />
        )
      ) : kind === "video" ? (
        <PlayPlaceholder size={22} />
      ) : (
        <PersonPlaceholder size={22} />
      )}
    </div>
  );
}
