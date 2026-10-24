"use client";

import { TrashIcon } from "@/components/admin/icons";
import { FolderGlyph, PencilGlyph, RootFolderGlyph, TwistGlyph } from "@/components/gallery/folder-icons";
import { toPersianDigits } from "@/lib/format";
import type { GalleryFolderNode } from "@/lib/gallery-folders";
import { GALLERY_ROOT_PREFIX } from "@/types/gallery-folders";

export function FolderTree({
  root,
  currentPrefix,
  collapsed,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  destination = false,
  disabledPrefix,
}: {
  root: GalleryFolderNode;
  currentPrefix: string;
  collapsed: ReadonlySet<string>;
  onToggle: (prefix: string) => void;
  onSelect: (prefix: string) => void;
  onRename?: (node: GalleryFolderNode) => void;
  onDelete?: (node: GalleryFolderNode) => void;
  destination?: boolean;
  disabledPrefix?: string;
}) {
  return (
    <ul className="folder-tree" role="tree" aria-label={destination ? "انتخاب مقصد" : "درخت پوشه‌ها"}>
      <FolderTreeItem
        node={root}
        currentPrefix={currentPrefix}
        collapsed={collapsed}
        onToggle={onToggle}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        destination={destination}
        disabledPrefix={disabledPrefix}
      />
    </ul>
  );
}

function FolderTreeItem({
  node,
  currentPrefix,
  collapsed,
  onToggle,
  onSelect,
  onRename,
  onDelete,
  destination,
  disabledPrefix,
}: {
  node: GalleryFolderNode;
  currentPrefix: string;
  collapsed: ReadonlySet<string>;
  onToggle: (prefix: string) => void;
  onSelect: (prefix: string) => void;
  onRename?: (node: GalleryFolderNode) => void;
  onDelete?: (node: GalleryFolderNode) => void;
  destination: boolean;
  disabledPrefix?: string;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.prefix);
  const active = node.prefix === currentPrefix;
  const disabled = disabledPrefix === node.prefix;
  const isRoot = node.prefix === GALLERY_ROOT_PREFIX;
  const label = destination && isRoot ? "ریشه" : node.label;
  const shown = disabled ? `${label} (فعلی)` : label;

  return (
    <li
      className={`tree-item${hasChildren && isCollapsed ? " is-collapsed" : ""}`}
      role="treeitem"
      aria-expanded={hasChildren ? !isCollapsed : undefined}
      aria-selected={active || undefined}
    >
      <div className={`tree-row${active ? " is-active" : ""}`} aria-current={active ? "true" : undefined} style={disabled ? { opacity: 0.55 } : undefined}>
        {hasChildren ? (
          <button
            type="button"
            className="tree-row__twist"
            aria-label={`باز یا بسته کردن ${label}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.prefix);
            }}
          >
            <TwistGlyph />
          </button>
        ) : (
          <span className="tree-row__twist tree-row__twist--spacer" aria-hidden="true">
            <TwistGlyph />
          </span>
        )}
        <span className="tree-row__icon">{isRoot ? <RootFolderGlyph /> : <FolderGlyph />}</span>
        <button
          type="button"
          className="tree-row__label"
          disabled={disabled}
          title={disabled ? "مبدأ" : undefined}
          onClick={() => onSelect(node.prefix)}
        >
          {shown}
        </button>
        <span className="tree-row__count">{toPersianDigits(node.objectCount)}</span>
        {!destination && !isRoot && onRename && onDelete ? (
          <span className="tree-item__actions">
            <button
              type="button"
              className="tree-item__btn"
              aria-label={`تغییر نام پوشه ${label}`}
              title="تغییر نام"
              onClick={(event) => {
                event.stopPropagation();
                onRename(node);
              }}
            >
              <PencilGlyph />
            </button>
            <button
              type="button"
              className="tree-item__btn tree-item__btn--danger"
              aria-label={`حذف پوشه ${label}`}
              title="حذف"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(node);
              }}
            >
              <TrashIcon />
            </button>
          </span>
        ) : null}
      </div>
      {hasChildren ? (
        <ul role="group">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.prefix}
              node={child}
              currentPrefix={currentPrefix}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              destination={destination}
              disabledPrefix={disabledPrefix}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
