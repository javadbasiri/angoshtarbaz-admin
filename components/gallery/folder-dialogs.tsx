"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertIcon, CloseIcon } from "@/components/admin/icons";
import { FolderTree } from "@/components/gallery/folder-tree";
import { toPersianDigits } from "@/lib/format";
import { autoRenameCandidate, parentPrefixOf, type GalleryFolderNode } from "@/lib/gallery-folders";
import type { GalleryBrowseFile, GalleryOnConflict } from "@/types/gallery-folders";

export type FolderDialog =
  | { kind: "create"; parentPrefix: string }
  | { kind: "rename"; prefix: string; name: string; label: string }
  | { kind: "delete-confirm"; prefix: string; label: string }
  | { kind: "delete-blocked"; prefix: string; label: string; objectCount: number; sampleKeys: string[] }
  | { kind: "move"; files: GalleryBrowseFile[] }
  | {
      kind: "conflict";
      destinationPrefix: string;
      files: GalleryBrowseFile[];
      conflicts: string[];
    };

export function FolderDialogs({
  dialog,
  tree,
  currentPrefix,
  busy,
  onClose,
  onCreate,
  onRename,
  onDelete,
  onChooseDestination,
  onResolveConflict,
}: {
  dialog: FolderDialog;
  tree: GalleryFolderNode | null;
  currentPrefix: string;
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<string | null>;
  onRename: (name: string) => Promise<string | null>;
  onDelete: () => Promise<void>;
  onChooseDestination: (destinationPrefix: string) => Promise<void>;
  onResolveConflict: (onConflict: GalleryOnConflict) => Promise<void>;
}) {
  return (
    <div className="modal-root folder-dialog" role="dialog" aria-modal="true" aria-labelledby="folderDialogTitle">
      <button type="button" className="modal-backdrop" aria-label="بستن" onClick={onClose} />
      {dialog.kind === "create" ? (
        <CreateFolderDialog parentPrefix={dialog.parentPrefix} busy={busy} onClose={onClose} onCreate={onCreate} />
      ) : null}
      {dialog.kind === "rename" ? (
        <RenameFolderDialog
          prefix={dialog.prefix}
          name={dialog.name}
          label={dialog.label}
          busy={busy}
          onClose={onClose}
          onRename={onRename}
        />
      ) : null}
      {dialog.kind === "delete-confirm" ? (
        <DeleteConfirmDialog prefix={dialog.prefix} label={dialog.label} busy={busy} onClose={onClose} onDelete={onDelete} />
      ) : null}
      {dialog.kind === "delete-blocked" ? (
        <DeleteBlockedDialog
          label={dialog.label}
          objectCount={dialog.objectCount}
          sampleKeys={dialog.sampleKeys}
          onClose={onClose}
        />
      ) : null}
      {dialog.kind === "move" && tree ? (
        <MoveFilesDialog
          files={dialog.files}
          tree={tree}
          currentPrefix={currentPrefix}
          busy={busy}
          onClose={onClose}
          onMove={onChooseDestination}
        />
      ) : null}
      {dialog.kind === "conflict" ? (
        <ConflictDialog
          destinationPrefix={dialog.destinationPrefix}
          conflicts={dialog.conflicts}
          total={dialog.files.length}
          busy={busy}
          onClose={onClose}
          onApply={onResolveConflict}
        />
      ) : null}
    </div>
  );
}

function DialogShell({
  title,
  subtitle,
  footerMeta,
  onClose,
  children,
  actions,
  size = "modal--sm",
}: {
  title: string;
  subtitle?: ReactNode;
  footerMeta?: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
  size?: string;
}) {
  return (
    <div className={`modal ${size}`} role="document">
      <div className="modal__header">
        <div>
          <h2 className="modal__title" id="folderDialogTitle" tabIndex={-1}>
            {title}
          </h2>
          {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
        </div>
        <button type="button" className="modal__close" aria-label="بستن" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="modal__body">{children}</div>
      <div className="modal__footer">
        <span className="modal__footer-meta">{footerMeta}</span>
        <div className="modal__footer-actions">{actions}</div>
      </div>
    </div>
  );
}

function CreateFolderDialog({
  parentPrefix,
  busy,
  onClose,
  onCreate,
}: {
  parentPrefix: string;
  busy: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();
  const preview = trimmed && !trimmed.includes("/") ? `${parentPrefix}${trimmed}/` : parentPrefix;

  return (
    <DialogShell
      title="پوشه جدید"
      subtitle={
        <>
          داخل پوشهٔ فعلی: <span dir="ltr">{parentPrefix}</span>
        </>
      }
      footerMeta="ابتدا پوشه، بعد آپلود"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            لغو
          </button>
          <button
            type="submit"
            form="create-folder-form"
            className="btn btn--primary"
            disabled={busy}
          >
            ایجاد پوشه
          </button>
        </>
      }
    >
      <form
        id="create-folder-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate(name).then((message) => setError(message));
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="folderName">
            نام پوشه
          </label>
          <input
            className={`field__input${error ? " is-invalid" : ""}`}
            id="folderName"
            type="text"
            value={name}
            dir="auto"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby="folderNameHint folderNameErr"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          <p className="field__hint" id="folderNameHint">
            فارسی مجاز است · بدون کاراکتر <code>/</code> · خالی نباشد · فاصله‌های ابتدا/انتها حذف می‌شوند
          </p>
          {error ? (
            <p className="field__error" id="folderNameErr">
              {error}
            </p>
          ) : null}
        </div>
        <div className="alert alert--info" style={{ marginTop: 8 }}>
          <div>
            <div className="alert__title">پیشوند حاصل</div>
            <div className="alert__body" dir="ltr">
              {preview}
            </div>
          </div>
        </div>
      </form>
    </DialogShell>
  );
}

function RenameFolderDialog({
  prefix,
  name: currentName,
  label,
  busy,
  onClose,
  onRename,
}: {
  prefix: string;
  name: string;
  label: string;
  busy: boolean;
  onClose: () => void;
  onRename: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const parent = parentPrefixOf(prefix) ?? prefix;
  const trimmed = name.trim();
  const nextPrefix = trimmed && !trimmed.includes("/") ? `${parent}${trimmed}/` : prefix;

  return (
    <DialogShell
      title="تغییر نام پوشه"
      subtitle={label}
      footerMeta="در صورت تداخل نام → خطا"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            لغو
          </button>
          <button type="submit" form="rename-folder-form" className="btn btn--primary" disabled={busy}>
            تغییر نام
          </button>
        </>
      }
    >
      <form
        id="rename-folder-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onRename(name).then((message) => setError(message));
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="renameName">
            نام جدید
          </label>
          <input
            className={`field__input${error ? " is-invalid" : ""}`}
            id="renameName"
            type="text"
            value={name}
            dir="auto"
            autoFocus
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          <p className="field__hint">
            فارسی مجاز · بدون <code>/</code>
          </p>
          {error ? <p className="field__error">{error}</p> : null}
        </div>
        <p className="field__hint field__hint--warn">
          همه کلیدهای زیر این پیشوند تغییر می‌کنند:
          <br />
          <span dir="ltr">
            {prefix}* → {nextPrefix}*
          </span>
          <br />
          محصولاتی که به این URLها وابسته‌اند ممکن است نیاز به به‌روزرسانی داشته باشند.
        </p>
      </form>
    </DialogShell>
  );
}

function DeleteConfirmDialog({
  prefix,
  label,
  busy,
  onClose,
  onDelete,
}: {
  prefix: string;
  label: string;
  busy: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <DialogShell
      title="حذف پوشه خالی؟"
      subtitle={label}
      footerMeta="غیرقابل بازگشت"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            لغو
          </button>
          <button type="button" className="btn btn--danger" disabled={busy} onClick={() => void onDelete()}>
            حذف پوشه
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: "var(--color-ink)", lineHeight: 1.7 }}>
        این پوشه خالی است (۰ فایل، بدون زیرپوشه). با تأیید، پیشوند <code dir="ltr">{prefix}</code> حذف می‌شود. نشانگر
        خالی <code dir="ltr">.keep</code> هم برداشته می‌شود.
      </p>
    </DialogShell>
  );
}

function DeleteBlockedDialog({
  label,
  objectCount,
  sampleKeys,
  onClose,
}: {
  label: string;
  objectCount: number;
  sampleKeys: string[];
  onClose: () => void;
}) {
  const extra = Math.max(0, objectCount - sampleKeys.length);
  return (
    <DialogShell
      title="حذف پوشه ممکن نیست"
      subtitle={label}
      footerMeta="قانون: حذف فقط وقتی خالی"
      onClose={onClose}
      actions={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          متوجه شدم
        </button>
      }
    >
      <div className="alert alert--error" role="alert">
        <span className="alert__icon">
          <AlertIcon />
        </span>
        <div>
          <div className="alert__title">پوشه خالی نیست</div>
          <div className="alert__body">
            پوشه خالی نیست؛ ابتدا فایل‌ها را جابه‌جا یا حذف کنید. این پوشه شامل{" "}
            <strong>{toPersianDigits(objectCount)} فایل</strong> است.
          </div>
        </div>
      </div>
      {sampleKeys.length ? (
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", fontSize: 13, color: "var(--color-muted)" }}>
          {sampleKeys.map((key) => (
            <li key={key} style={{ padding: "4px 0" }} dir="ltr">
              • {key}
            </li>
          ))}
          {extra > 0 ? (
            <li style={{ padding: "4px 0" }} dir="ltr">
              • … و {toPersianDigits(extra)} مورد دیگر
            </li>
          ) : null}
        </ul>
      ) : null}
    </DialogShell>
  );
}

function MoveFilesDialog({
  files,
  tree,
  currentPrefix,
  busy,
  onClose,
  onMove,
}: {
  files: GalleryBrowseFile[];
  tree: GalleryFolderNode;
  currentPrefix: string;
  busy: boolean;
  onClose: () => void;
  onMove: (destinationPrefix: string) => void;
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  return (
    <DialogShell
      title="جابه‌جایی فایل‌ها"
      subtitle={`${toPersianDigits(files.length)} فایل انتخاب‌شده · مقصد را از درخت انتخاب کنید`}
      footerMeta="در صورت تداخل نام فایل → گزینه‌ها"
      onClose={onClose}
      size="modal--move"
      actions={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            لغو
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !destination}
            onClick={() => destination && onMove(destination)}
          >
            جابه‌جایی
          </button>
        </>
      }
    >
      <div className="move-files-list" aria-label="فایل‌های در حال جابه‌جایی">
        {files.map((file) => (
          <div key={file.key} className="move-file-chip">
            <span className="move-file-chip__thumb ph-1" />
            <span className="move-file-chip__name">{file.name}</span>
          </div>
        ))}
      </div>
      <div className="field">
        <span className="field__label">پوشه مقصد</span>
        <div className="move-dest-tree">
          <FolderTree
            root={tree}
            currentPrefix={destination ?? ""}
            collapsed={collapsed}
            destination
            disabledPrefix={currentPrefix}
            onToggle={(prefix) => {
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(prefix)) next.delete(prefix);
                else next.add(prefix);
                return next;
              });
            }}
            onSelect={setDestination}
          />
        </div>
        <p className="field__hint" style={{ marginTop: 8 }}>
          مقصد انتخاب‌شده: <code dir="ltr">{destination ?? "—"}</code>
        </p>
      </div>
    </DialogShell>
  );
}

function ConflictDialog({
  destinationPrefix,
  conflicts,
  total,
  busy,
  onClose,
  onApply,
}: {
  destinationPrefix: string;
  conflicts: string[];
  total: number;
  busy: boolean;
  onClose: () => void;
  onApply: (onConflict: GalleryOnConflict) => void;
}) {
  const [choice, setChoice] = useState<GalleryOnConflict>("replace");
  const sample = conflicts[0] ?? "";
  const options: { value: GalleryOnConflict; title: string; desc: string }[] = [
    { value: "replace", title: "جایگزین", desc: "فایل مقصد بازنویسی می‌شود (غیرقابل بازگشت)." },
    {
      value: "autoRename",
      title: "تغییر نام خودکار",
      desc: sample ? `ذخیره به‌صورت ${autoRenameCandidate(sample)}` : "ذخیره با پسوند -۱",
    },
    { value: "skip", title: "لغو این فایل", desc: "این مورد جابه‌جا نشود؛ بقیه ادامه یابند." },
  ];

  return (
    <DialogShell
      title="تداخل نام فایل"
      subtitle="در مقصد فایلی با همین نام وجود دارد"
      footerMeta={`${toPersianDigits(conflicts.length)} از ${toPersianDigits(total)} فایل دارای تداخل`}
      onClose={onClose}
      size="modal--md"
      actions={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            بازگشت
          </button>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => onApply(choice)}>
            اعمال و ادامه
          </button>
        </>
      }
    >
      <div className="alert alert--error" role="alert">
        <div>
          <div className="alert__title">نام تکراری</div>
          <div className="alert__body">
            {conflicts.map((name) => (
              <span key={name} dir="ltr">
                {name}{" "}
              </span>
            ))}
            هم‌اکنون در <code dir="ltr">{destinationPrefix}</code> هست.
          </div>
        </div>
      </div>
      <div className="conflict-options" role="radiogroup" aria-label="نحوه برخورد با تداخل">
        {options.map((option) => (
          <label key={option.value} className={`conflict-option${choice === option.value ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="conflict"
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
            />
            <span>
              <span className="conflict-option__title">{option.title}</span>
              <span className="conflict-option__desc">{option.desc}</span>
            </span>
          </label>
        ))}
      </div>
    </DialogShell>
  );
}

export function useDialogFocus(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const root = document.querySelector(".folder-dialog");
      const field = root?.querySelector<HTMLElement>("input, textarea");
      (field ?? document.getElementById("folderDialogTitle"))?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);
}
