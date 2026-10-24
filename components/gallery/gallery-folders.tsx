"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertIcon, CheckIcon, GalleryIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/admin/icons";
import { FolderDialogs, useDialogFocus, type FolderDialog } from "@/components/gallery/folder-dialogs";
import { FolderGlyph, MoveGlyph } from "@/components/gallery/folder-icons";
import { FolderTree } from "@/components/gallery/folder-tree";
import { MediaThumb } from "@/components/gallery/media-thumb";
import { env } from "@/lib/env";
import { formatFileSize, galleryKindFrom, isAllowedGalleryFile } from "@/lib/gallery";
import { getGalleryFoldersClient, loadFoldersTree } from "@/lib/gallery-folders-client";
import {
  GalleryFoldersError,
  galleryBreadcrumbs,
  parentPrefixOf,
  resolveGalleryPrefix,
  type GalleryFolderNode,
} from "@/lib/gallery-folders";
import { putGalleryBytes } from "@/lib/gallery-upload";
import { toPersianDigits } from "@/lib/format";
import {
  FOLDER_NOT_EMPTY_MESSAGE,
  GALLERY_DELIMITER,
  GALLERY_ROOT_PREFIX,
  type GalleryBrowseFile,
  type GalleryBrowseResult,
  type GalleryOnConflict,
} from "@/types/gallery-folders";

const TILE_LABELS: Record<string, string> = {
  "red-solitaire.jpg": "قرمز ۱",
  "red-side.jpg": "قرمز ۲",
  "red-detail.jpg": "جزئیات",
  "red-box.jpg": "جعبه",
};

const TILE_BADGES: Record<string, string> = {
  "red-solitaire.jpg": "سولیتر",
  "red-side.jpg": "جانبی",
  "red-detail.jpg": "۰.۸ قیراط",
};

type UploadTile = {
  localId: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "uploading" | "error";
  error: string;
};

type Toast = { kind: "success" | "error"; text: string };

function newLocalId() {
  return `up-${Math.random().toString(36).slice(2, 10)}`;
}

function findNode(node: GalleryFolderNode | null, prefix: string): GalleryFolderNode | null {
  if (!node) return null;
  if (node.prefix === prefix) return node;
  for (const child of node.children) {
    const found = findNode(child, prefix);
    if (found) return found;
  }
  return null;
}

function rewritePrefix(current: string, fromPrefix: string, toPrefix: string) {
  if (current === fromPrefix || current.startsWith(fromPrefix)) return toPrefix + current.slice(fromPrefix.length);
  return current;
}

export function GalleryFoldersLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPrefix = resolveGalleryPrefix(searchParams.get("prefix"), { demo: env.galleryFoldersStub });
  const [page, setPage] = useState<GalleryBrowseResult | null>(null);
  const [tree, setTree] = useState<GalleryFolderNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [uploads, setUploads] = useState<UploadTile[]>([]);
  const [dialog, setDialog] = useState<FolderDialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previews = useRef<Map<string, string>>(new Map());

  useDialogFocus(dialog !== null);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const client = getGalleryFoldersClient();
    void (async () => {
      try {
        const [listed, nextTree] = await Promise.all([
          client.browse({ prefix: currentPrefix, delimiter: GALLERY_DELIMITER }),
          loadFoldersTree(client),
        ]);
        if (cancelled) return;
        setPage(listed);
        setTree(nextTree);
      } catch (error) {
        if (cancelled) return;
        setToast({
          kind: "error",
          text: error instanceof GalleryFoldersError ? error.message : "بارگذاری پوشه‌ها ناموفق بود.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPrefix, revision]);

  useEffect(() => {
    setSelected([]);
    setSelectMode(false);
  }, [currentPrefix]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (dialog) setDialog(null);
      else setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog]);

  const crumbs = useMemo(() => galleryBreadcrumbs(currentPrefix), [currentPrefix]);
  const currentLabel = crumbs[crumbs.length - 1]?.label ?? "ریشه";
  const readyPage = page?.currentPrefix === currentPrefix ? page : null;
  const folders = readyPage?.folders ?? [];
  const files = readyPage?.files ?? [];
  const isRoot = currentPrefix === GALLERY_ROOT_PREFIX;
  const discourageUpload = isRoot && folders.length === 0;
  const showEmptyRoot = discourageUpload && files.length === 0 && uploads.length === 0 && readyPage;
  const showEmptyFolder = !isRoot && readyPage && folders.length === 0 && files.length === 0 && uploads.length === 0;
  const showSelectBar = selectMode || selected.length > 0;

  function go(prefix: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("prefix", prefix);
    router.replace(`/gallery?${params.toString()}`);
    setDrawerOpen(false);
  }

  function toggleCollapsed(prefix: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }

  function toggleSelect(key: string) {
    setSelectMode(true);
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function openDelete(node: GalleryFolderNode) {
    if (node.objectCount === 0 && node.children.length === 0) {
      setDialog({ kind: "delete-confirm", prefix: node.prefix, label: node.label });
      return;
    }
    const listed = await getGalleryFoldersClient().browse({ prefix: node.prefix, delimiter: GALLERY_DELIMITER });
    setDialog({
      kind: "delete-blocked",
      prefix: node.prefix,
      label: node.label,
      objectCount: node.objectCount,
      sampleKeys: listed.files.slice(0, 2).map((file) => file.key),
    });
  }

  async function onCreate(name: string): Promise<string | null> {
    setBusy(true);
    try {
      const created = await getGalleryFoldersClient().createFolder({ parentPrefix: currentPrefix, name });
      setDialog(null);
      setToast({ kind: "success", text: "پوشه ساخته شد" });
      go(created.prefix);
      return null;
    } catch (error) {
      const message = error instanceof GalleryFoldersError ? error.message : "ساخت پوشه ناموفق بود.";
      if (error instanceof GalleryFoldersError && error.code === "FOLDER_EXISTS") {
        setToast({ kind: "error", text: message });
      }
      return message;
    } finally {
      setBusy(false);
    }
  }

  async function onRename(name: string): Promise<string | null> {
    if (dialog?.kind !== "rename") return null;
    setBusy(true);
    try {
      const result = await getGalleryFoldersClient().renameFolder({ fromPrefix: dialog.prefix, toName: name });
      const nextPrefix = rewritePrefix(currentPrefix, result.fromPrefix, result.toPrefix);
      setDialog(null);
      setToast({ kind: "success", text: "نام پوشه تغییر کرد" });
      if (nextPrefix !== currentPrefix) go(nextPrefix);
      else reload();
      return null;
    } catch (error) {
      const message = error instanceof GalleryFoldersError ? error.message : "تغییر نام ناموفق بود.";
      if (error instanceof GalleryFoldersError && error.code === "FOLDER_EXISTS") {
        setToast({ kind: "error", text: message });
      }
      return message;
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (dialog?.kind !== "delete-confirm") return;
    setBusy(true);
    try {
      await getGalleryFoldersClient().deleteFolder({ prefix: dialog.prefix });
      const parent = parentPrefixOf(dialog.prefix) ?? GALLERY_ROOT_PREFIX;
      setDialog(null);
      setToast({ kind: "success", text: "پوشه خالی حذف شد" });
      if (currentPrefix === dialog.prefix || currentPrefix.startsWith(dialog.prefix)) go(parent);
      else reload();
    } catch (error) {
      if (error instanceof GalleryFoldersError && error.code === "FOLDER_NOT_EMPTY") {
        setDialog({
          kind: "delete-blocked",
          prefix: dialog.prefix,
          label: dialog.label,
          objectCount: error.objectCount ?? 0,
          sampleKeys: [],
        });
        setToast({ kind: "error", text: FOLDER_NOT_EMPTY_MESSAGE });
      } else {
        setToast({ kind: "error", text: error instanceof Error ? error.message : "حذف پوشه ناموفق بود." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function runMove(keys: string[], destinationPrefix: string, onConflict: GalleryOnConflict) {
    setBusy(true);
    try {
      const result = await getGalleryFoldersClient().moveObjects({ keys, destinationPrefix, onConflict });
      const count = result.moved.length + result.renamed.length;
      setDialog(null);
      setSelected([]);
      setSelectMode(false);
      setToast({
        kind: "success",
        text:
          result.skipped.length && !count
            ? "جابه‌جایی لغو شد"
            : `${toPersianDigits(count)} فایل جابه‌جا شد${result.skipped.length ? ` · ${toPersianDigits(result.skipped.length)} لغو` : ""}`,
      });
      reload();
    } catch (error) {
      setToast({ kind: "error", text: error instanceof GalleryFoldersError ? error.message : "جابه‌جایی ناموفق بود." });
    } finally {
      setBusy(false);
    }
  }

  async function onChooseDestination(destinationPrefix: string) {
    if (dialog?.kind !== "move") return;
    setBusy(true);
    try {
      const listed = await getGalleryFoldersClient().browse({ prefix: destinationPrefix, delimiter: GALLERY_DELIMITER });
      const names = new Set(listed.files.map((file) => file.name));
      const conflicts = dialog.files.filter((file) => names.has(file.name)).map((file) => file.name);
      if (conflicts.length) {
        setDialog({ kind: "conflict", destinationPrefix, files: dialog.files, conflicts });
        return;
      }
      await runMove(
        dialog.files.map((file) => file.key),
        destinationPrefix,
        "skip",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onResolveConflict(onConflict: GalleryOnConflict) {
    if (dialog?.kind !== "conflict") return;
    await runMove(
      dialog.files.map((file) => file.key),
      dialog.destinationPrefix,
      onConflict,
    );
  }

  async function deleteKeys(keys: string[]) {
    if (keys.length === 0) return;
    const confirmed = window.confirm(
      keys.length === 1
        ? "این فایل از کتابخانه حذف می‌شود. ادامه می‌دهید؟"
        : `${toPersianDigits(keys.length)} فایل حذف می‌شوند. ادامه می‌دهید؟`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      await getGalleryFoldersClient().deleteObjects({ keys });
      setSelected([]);
      setToast({ kind: "success", text: keys.length === 1 ? "فایل حذف شد" : "فایل‌های انتخاب‌شده حذف شدند" });
      reload();
    } catch (error) {
      setToast({
        kind: "error",
        text: error instanceof GalleryFoldersError ? error.message : "حذف فایل ناموفق بود.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runUpload(tile: UploadTile) {
    const client = getGalleryFoldersClient();
    try {
      const allowed = isAllowedGalleryFile(tile.file);
      if (!allowed.ok) throw new GalleryFoldersError(400, "VALIDATION", allowed.message);
      const contentType = tile.file.type || (allowed.kind === "video" ? "video/mp4" : "image/jpeg");
      setUploads((current) => current.map((item) => (item.localId === tile.localId ? { ...item, progress: 18 } : item)));
      const presign = await client.presign({
        filename: tile.file.name,
        mime: contentType,
        size: tile.file.size,
        prefix: currentPrefix,
      });
      if (presign.provider !== "stub") {
        await putGalleryBytes(presign.uploadUrl, tile.file, presign.headers, (percent) => {
          const progress = 18 + Math.round(percent * 0.7);
          setUploads((current) =>
            current.map((item) => (item.localId === tile.localId ? { ...item, progress } : item)),
          );
        });
      } else {
        setUploads((current) => current.map((item) => (item.localId === tile.localId ? { ...item, progress: 70 } : item)));
      }
      setUploads((current) => current.map((item) => (item.localId === tile.localId ? { ...item, progress: 92 } : item)));
      if (tile.previewUrl) previews.current.set(presign.key, tile.previewUrl);
      await client.register({
        key: presign.key,
        publicUrl: presign.provider === "stub" ? tile.previewUrl : presign.publicUrl,
        filename: tile.file.name,
        mimeType: contentType,
        size: tile.file.size,
      });
      setUploads((current) => current.filter((item) => item.localId !== tile.localId));
      reload();
    } catch (error) {
      setUploads((current) =>
        current.map((item) =>
          item.localId === tile.localId
            ? { ...item, status: "error", error: error instanceof Error ? error.message : "آپلود ناموفق بود." }
            : item,
        ),
      );
    }
  }

  function queueFiles(fileList: FileList | null) {
    const incoming = Array.from(fileList ?? []);
    if (incoming.length === 0) return;
    const next: UploadTile[] = [];
    const rejected: string[] = [];
    for (const file of incoming) {
      const allowed = isAllowedGalleryFile(file);
      const localId = newLocalId();
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      if (!allowed.ok) {
        next.push({ localId, file, previewUrl, progress: 0, status: "error", error: allowed.message });
        rejected.push(file.name);
        continue;
      }
      next.push({ localId, file, previewUrl, progress: 8, status: "uploading", error: "" });
    }
    setUploads((current) => [...next, ...current]);
    if (rejected.length) {
      setToast({
        kind: "error",
        text: `${toPersianDigits(rejected.length)} فایل رد شد: JPG/PNG/WebP تا ۱۲ مگابایت یا MP4 تا ۵۰ مگابایت.`,
      });
    }
    for (const tile of next) {
      if (tile.status === "uploading") void runUpload(tile);
    }
  }

  function selectedFiles(): GalleryBrowseFile[] {
    return files.filter((file) => selected.includes(file.key));
  }

  if (loading && !tree) return <GalleryFoldersSkeleton />;

  const title = isRoot ? "ریشه · همه فایل‌ها" : `پوشه فعلی: ${currentLabel}`;
  const countLabel = !readyPage
    ? ""
    : showEmptyRoot
      ? "۰ پوشه · ۰ فایل"
      : isRoot
        ? `${toPersianDigits(folders.length)} پوشه · ${toPersianDigits(files.length)} فایل`
        : `${toPersianDigits(files.length)} فایل در این پوشه · فقط محتویات فعلی (غیر بازگشتی)`;

  return (
    <div className="media-page media-page--folders">
      <p className="media-route">
        /gallery · پوشه‌ها = پیشوند key
        {env.galleryFoldersStub ? " · دادهٔ آزمایشی" : ""}
      </p>

      <div className="folders-mobile-bar">
        <button
          type="button"
          className="btn btn--secondary btn--sm btn--folders-toggle"
          aria-expanded={drawerOpen}
          aria-controls="folderPanel"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <FolderGlyph /> پوشه‌ها
        </button>
        <FolderBreadcrumb crumbs={crumbs} onNavigate={go} />
      </div>

      <div className="media-layout">
        <button
          type="button"
          className="folder-drawer-backdrop"
          aria-label="بستن پوشه‌ها"
          hidden={!drawerOpen}
          onClick={() => setDrawerOpen(false)}
        />
        <aside className={`folder-panel${drawerOpen ? " is-open" : ""}`} id="folderPanel" aria-label="پوشه‌های رسانه">
          <div className="folder-panel__header">
            <span className="folder-panel__title">پوشه‌ها</span>
            <button type="button" className="btn btn--primary btn--sm" aria-label="پوشه جدید" onClick={() => setDialog({ kind: "create", parentPrefix: currentPrefix })}>
              <PlusIcon /> پوشه
            </button>
          </div>
          <div className="folder-panel__body">
            {tree ? (
              <FolderTree
                root={tree}
                currentPrefix={currentPrefix}
                collapsed={collapsed}
                onToggle={toggleCollapsed}
                onSelect={go}
                onRename={(node) => setDialog({ kind: "rename", prefix: node.prefix, name: node.name, label: node.label })}
                onDelete={(node) => void openDelete(node)}
              />
            ) : (
              <TreeSkeleton />
            )}
            {showEmptyRoot ? (
              <p style={{ padding: 12, fontSize: 12, color: "var(--color-muted)", lineHeight: 1.6, margin: 0 }}>
                هنوز پوشه‌ای نیست. جریان پیشنهادی: ساخت پوشه ← آپلود عکس داخل آن.
              </p>
            ) : null}
          </div>
          <div className="folder-panel__footer">
            <p className="folder-panel__hint">
              پوشه‌ها پیشوند مسیر روی کلید آبجکت هستند (مثلاً <code dir="ltr">gallery/rings/</code>). پوشهٔ خالی با نشانگر
              صفر-بایتی <code dir="ltr">.keep</code> می‌ماند و در گرید دیده نمی‌شود. حذف فقط برای پوشه خالی.
            </p>
          </div>
        </aside>

        <div className="media-main">
          <div className="media-toolbar media-toolbar--folders">
            <div className="media-toolbar__meta">
              <strong style={{ fontSize: "var(--font-size-16)" }}>{title}</strong>
              <div className="media-toolbar__path">
                <FolderBreadcrumb crumbs={crumbs} onNavigate={go} />
                <span className="folder-path-chip" title="پیشوند">{currentPrefix}</span>
              </div>
              <span className="media-toolbar__count">{countLabel}</span>
            </div>
            <div className="media-toolbar__actions">
              <button
                type="button"
                className={`btn btn--sm ${discourageUpload || showEmptyFolder ? "btn--primary" : "btn--secondary"}`}
                onClick={() => setDialog({ kind: "create", parentPrefix: currentPrefix })}
              >
                <PlusIcon /> {showEmptyFolder ? "زیرپوشه" : "پوشه جدید"}
              </button>
              {showEmptyFolder ? (
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => {
                    const node = findNode(tree, currentPrefix);
                    if (node) void openDelete(node);
                    else setDialog({ kind: "delete-confirm", prefix: currentPrefix, label: currentLabel });
                  }}
                >
                  حذف پوشه
                </button>
              ) : null}
              {!showEmptyRoot && !showEmptyFolder && readyPage ? (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  aria-pressed={selectMode}
                  onClick={() => {
                    if (selectMode) {
                      setSelectMode(false);
                      setSelected([]);
                    } else setSelectMode(true);
                  }}
                >
                  حالت انتخاب
                </button>
              ) : null}
              <button
                type="button"
                className={`btn btn--sm ${discourageUpload ? "btn--secondary" : "btn--primary"}`}
                onClick={openFilePicker}
              >
                <UploadIcon /> {isRoot ? "آپلود" : "آپلود در این پوشه"}
              </button>
            </div>
          </div>

          {showSelectBar && readyPage ? (
            <div className="select-bar" role="status">
              <span className="select-bar__count">{toPersianDigits(selected.length)} مورد انتخاب شده</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(files.map((file) => file.key))}>
                انتخاب همه
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setSelected([]);
                  setSelectMode(false);
                }}
              >
                لغو انتخاب
              </button>
              <span className="select-bar__spacer" />
              <button
                type="button"
                className="btn btn--sm btn--move"
                disabled={selected.length === 0}
                onClick={() => setDialog({ kind: "move", files: selectedFiles() })}
              >
                جابه‌جایی به پوشه…
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={selected.length === 0 || busy}
                onClick={() => void deleteKeys(selected)}
              >
                حذف دسته‌ای
              </button>
            </div>
          ) : null}

          {showEmptyRoot ? (
            <div className="media-empty media-empty--folder-first">
              <div className="media-empty__icon" aria-hidden="true">
                <FolderGlyph />
              </div>
              <h2 className="media-empty__title">هنوز پوشه‌ای ندارید</h2>
              <p className="media-empty__body">
                برای نظم گالری جواهر، <strong>ابتدا پوشه بسازید</strong> (مثلاً حلقه‌ها / نامزدی)، سپس عکس‌ها را داخل همان پوشه آپلود کنید.
              </p>
              <div className="media-empty__actions">
                <button type="button" className="btn btn--primary" onClick={() => setDialog({ kind: "create", parentPrefix: currentPrefix })}>
                  <PlusIcon /> پوشه جدید
                </button>
                <button type="button" className="btn btn--secondary" onClick={openFilePicker}>
                  آپلود فایل
                </button>
              </div>
              <p className="media-empty__secondary">آپلود بدون پوشه توصیه نمی‌شود؛ فایل‌ها در ریشه پراکنده می‌شوند.</p>
            </div>
          ) : readyPage ? (
            <Dropzone
              title={showEmptyFolder ? "این پوشه خالی است — فایل‌ها را اینجا رها کنید" : "آپلود در پوشهٔ انتخاب‌شده"}
              hint={showEmptyFolder ? undefined : "JPG، PNG، WebP، MP4 · حداکثر ۱۲ مگابایت · چندفایلی"}
              prefix={currentPrefix}
              dragOver={dragOver}
              discouraged={discourageUpload}
              onOpen={openFilePicker}
              onDragOver={(over) => setDragOver(over)}
              onDrop={queueFiles}
            />
          ) : (
            <GridSkeleton />
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

          {showEmptyFolder ? (
            <div className="media-empty">
              <div className="media-empty__icon" aria-hidden="true">
                <GalleryIcon />
              </div>
              <h2 className="media-empty__title">فایلی در این پوشه نیست</h2>
              <p className="media-empty__body">
                عکس‌ها را آپلود کنید، یا از پوشه‌های دیگر به اینجا جابه‌جا کنید. چون خالی است می‌توانید پوشه را حذف کنید. نشانگر{" "}
                <code dir="ltr">.keep</code> فقط برای ماندن پوشه است و نمایش داده نمی‌شود.
              </p>
              <div className="media-empty__actions" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn btn--primary" onClick={openFilePicker}>
                  <UploadIcon /> آپلود
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    const node = findNode(tree, currentPrefix);
                    if (node) void openDelete(node);
                  }}
                >
                  حذف پوشه خالی
                </button>
              </div>
            </div>
          ) : null}

          {readyPage && (files.length > 0 || uploads.length > 0) ? (
            <div className="media-grid" role="list" aria-label={`فایل‌های پوشه ${currentLabel}`}>
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
                        <span className="media-tile__progress-label">در حال آپلود… {toPersianDigits(tile.progress)}٪</span>
                        <div className="progress-bar" role="progressbar" aria-valuenow={tile.progress} aria-valuemin={0} aria-valuemax={100}>
                          <div className="progress-bar__fill" style={{ width: `${tile.progress}%` }} />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="media-tile__error-msg">{tile.error}</span>
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          style={{ marginTop: 4 }}
                          onClick={() => setUploads((current) => current.filter((item) => item.localId !== tile.localId))}
                        >
                          حذف
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {files.map((file) => {
                const isSelected = selected.includes(file.key);
                const kind = galleryKindFrom(file.contentType, file.name);
                return (
                  <article key={file.key} className={`media-tile${isSelected ? " is-selected" : ""}`} role="listitem">
                    <input
                      className="media-tile__check"
                      type="checkbox"
                      checked={isSelected}
                      aria-label={`انتخاب ${file.name}`}
                      onChange={() => toggleSelect(file.key)}
                    />
                    <MediaThumb
                      id={file.id ?? file.key}
                      url={file.url || previews.current.get(file.key)}
                      kind={kind}
                      label={TILE_LABELS[file.name] ?? file.name}
                    />
                    {kind === "video" ? (
                      <span className="media-tile__badge media-tile__badge--video">ویدیو</span>
                    ) : TILE_BADGES[file.name] ? (
                      <span className="media-tile__badge">{TILE_BADGES[file.name]}</span>
                    ) : null}
                    <div className="media-tile__meta">
                      <span className="media-tile__name">{file.name}</span>
                      <span className="media-tile__size">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="media-tile__actions">
                      <button
                        type="button"
                        className="media-tile__btn media-tile__btn--move"
                        aria-label={`جابه‌جایی ${file.name}`}
                        title="جابه‌جایی"
                        onClick={() => setDialog({ kind: "move", files: [file] })}
                      >
                        <MoveGlyph />
                      </button>
                      <button
                        type="button"
                        className="media-tile__btn"
                        aria-label={`حذف ${file.name}`}
                        onClick={() => void deleteKeys([file.key])}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {dialog ? (
        <FolderDialogs
          dialog={dialog}
          tree={tree}
          currentPrefix={currentPrefix}
          busy={busy}
          onClose={() => setDialog(null)}
          onCreate={onCreate}
          onRename={onRename}
          onDelete={onDelete}
          onChooseDestination={onChooseDestination}
          onResolveConflict={onResolveConflict}
        />
      ) : null}

      {toast ? (
        <div className={`toast toast--${toast.kind === "success" ? "success" : "error"}`} role={toast.kind === "error" ? "alert" : "status"}>
          {toast.kind === "success" ? <CheckIcon /> : <AlertIcon />}
          <span>{toast.text}</span>
          <button type="button" className="toast__close" aria-label="بستن" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FolderBreadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: { prefix: string; label: string }[];
  onNavigate: (prefix: string) => void;
}) {
  return (
    <nav className="folder-breadcrumb" aria-label="مسیر پوشه">
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1;
        return (
          <Fragment key={crumb.prefix}>
            {index > 0 ? <span className="folder-breadcrumb__sep">/</span> : null}
            {last ? (
              <span className="folder-breadcrumb__current">{crumb.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(crumb.prefix)}>
                {crumb.label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function Dropzone({
  title,
  hint,
  prefix,
  dragOver,
  discouraged,
  onOpen,
  onDragOver,
  onDrop,
}: {
  title: string;
  hint?: string;
  prefix: string;
  dragOver: boolean;
  discouraged: boolean;
  onOpen: () => void;
  onDragOver: (over: boolean) => void;
  onDrop: (files: FileList | null) => void;
}) {
  return (
    <div
      className={`dropzone dropzone--compact${dragOver ? " is-dragover" : ""}${discouraged ? " dropzone--discouraged" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="آپلود در پوشه فعلی"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(true);
      }}
      onDragLeave={() => onDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        onDragOver(false);
        onDrop(event.dataTransfer.files);
      }}
    >
      <div className="dropzone__copy">
        <div className="dropzone__icon" aria-hidden="true">
          <UploadIcon />
        </div>
        <div>
          <div className="dropzone__title">{title}</div>
          {hint ? <div className="dropzone__hint">{hint}</div> : null}
          <div className="dropzone__path">
            مقصد: <code>{prefix}</code>
          </div>
          {discouraged ? <div className="dropzone__hint">آپلود در ریشه توصیه نمی‌شود.</div> : null}
        </div>
      </div>
      <div className="dropzone__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          انتخاب فایل‌ها
        </button>
      </div>
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div aria-busy="true" aria-label="بارگذاری پوشه‌ها">
      <div className="tree-skel" />
      <div className="tree-skel" />
      <div className="tree-skel" />
      <div className="tree-skel" />
      <div className="tree-skel" />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="media-grid" role="list" aria-busy="true" aria-label="بارگذاری فایل‌ها">
      {Array.from({ length: 8 }, (_, index) => (
        <article key={index} className="media-tile media-tile--skeleton" role="listitem" aria-hidden="true">
          <div className="sk sk--media" />
        </article>
      ))}
    </div>
  );
}

export function GalleryFoldersSkeleton() {
  return (
    <div className="media-page media-page--folders" aria-busy="true" aria-label="در حال بارگذاری گالری">
      <p className="media-route">/gallery · پوشه‌ها</p>
      <div className="media-layout">
        <aside className="folder-panel" aria-hidden="true">
          <div className="folder-panel__header">
            <span className="folder-panel__title">پوشه‌ها</span>
          </div>
          <div className="folder-panel__body">
            <TreeSkeleton />
          </div>
        </aside>
        <div className="media-main">
          <div className="media-toolbar">
            <div className="media-toolbar__meta">
              <div className="tree-skel" style={{ width: 180, height: 20, margin: 0 }} />
              <div className="tree-skel" style={{ width: 120, height: 14, marginTop: 8 }} />
            </div>
          </div>
          <GridSkeleton />
        </div>
      </div>
    </div>
  );
}
