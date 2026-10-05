import type { GalleryPresign, GalleryRegisterInput } from "../types/gallery.ts";
import {
  DEFAULT_GALLERY_PREFIX,
  EMPTY_FOLDER_MARKER,
  FOLDER_EXISTS_MESSAGE,
  FOLDER_NOT_EMPTY_MESSAGE,
  GALLERY_BROWSE_PATH,
  GALLERY_DELIMITER,
  GALLERY_FOLDERS_PATH,
  GALLERY_FOLDERS_RENAME_PATH,
  GALLERY_OBJECTS_MOVE_PATH,
  GALLERY_PRESIGN_PATH,
  GALLERY_ROOT_PREFIX,
  type GalleryBrowseFile,
  type GalleryBrowseResult,
  type GalleryCreateFolderBody,
  type GalleryCreateFolderResult,
  type GalleryFolderEntry,
  type GalleryFolderPresignBody,
  type GalleryFoldersClient,
  type GalleryFoldersErrorCode,
  type GalleryMoveObjectsBody,
  type GalleryMoveResult,
  type GalleryOnConflict,
  type GalleryRenameFolderBody,
  type GalleryRenameFolderResult,
} from "../types/gallery-folders.ts";

/**
 * In-memory ANG-A6 client. Paths and bodies match Nest so a later adapter is a
 * thin swap (server actions + admin JWT). This module never calls Nest.
 */

export class GalleryFoldersError extends Error {
  readonly status: number;
  readonly code: GalleryFoldersErrorCode;
  readonly objectCount?: number;

  constructor(status: number, code: GalleryFoldersErrorCode, message: string, objectCount?: number) {
    super(message);
    this.name = "GalleryFoldersError";
    this.status = status;
    this.code = code;
    this.objectCount = objectCount;
  }
}

export type GalleryObjectRecord = {
  key: string;
  id: string | null;
  size: number;
  contentType: string;
  updatedAt: string;
  url: string;
};

export type GalleryFolderNode = {
  prefix: string;
  name: string;
  label: string;
  objectCount: number;
  children: GalleryFolderNode[];
};

const KNOWN_FOLDER_ORDER = ["rings", "red", "engagement", "products", "solitaire", "archive"];

/** Demo labels for the seeded English prefixes. User-created folders use their name. */
export const GALLERY_FOLDER_LABELS: Record<string, string> = {
  "gallery/": "همه فایل‌ها",
  "gallery/rings/": "حلقه‌ها",
  "gallery/rings/red/": "قرمز",
  "gallery/rings/engagement/": "نامزدی",
  "gallery/products/": "محصولات",
  "gallery/products/solitaire/": "سولیتر",
  "gallery/archive/": "آرشیو خالی",
};

const SEED_UPDATED_AT = "2026-10-01T12:00:00.000Z";

export function galleryBrowsePath(prefix: string): string {
  return `${GALLERY_BROWSE_PATH}?prefix=${encodeURIComponent(prefix)}&delimiter=${GALLERY_DELIMITER}`;
}

export function galleryFolderDeletePath(prefix: string): string {
  return `${GALLERY_FOLDERS_PATH}?prefix=${encodeURIComponent(prefix)}`;
}

export function galleryObjectDeletePath(id: string): string {
  return `/gallery/${encodeURIComponent(id)}`;
}

/** Nest presign body: existing fields plus the current folder prefix. */
export function folderPresignBody(input: GalleryFolderPresignBody): GalleryFolderPresignBody {
  return {
    filename: input.filename,
    mime: input.mime,
    size: input.size,
    prefix: input.prefix,
  };
}

export function renameFolderBody(input: GalleryRenameFolderBody): GalleryRenameFolderBody {
  if (input.toPrefix) return { fromPrefix: input.fromPrefix, toPrefix: input.toPrefix };
  return { fromPrefix: input.fromPrefix, toName: input.toName ?? "" };
}

export function normalizePrefix(prefix: string | null | undefined): string {
  let value = (prefix ?? "").trim().replace(/^\/+/, "");
  if (!value) return GALLERY_ROOT_PREFIX;
  if (!value.endsWith("/")) value += "/";
  if (!value.startsWith(GALLERY_ROOT_PREFIX)) value = `${GALLERY_ROOT_PREFIX}${value}`;
  return value;
}

export function resolveGalleryPrefix(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === "") return DEFAULT_GALLERY_PREFIX;
  return normalizePrefix(raw);
}

export function parentPrefixOf(prefix: string): string | null {
  const normalized = normalizePrefix(prefix);
  if (normalized === GALLERY_ROOT_PREFIX) return null;
  const withoutTrailing = normalized.slice(0, -1);
  const slash = withoutTrailing.lastIndexOf("/");
  if (slash < 0) return null;
  return withoutTrailing.slice(0, slash + 1);
}

export function basename(key: string): string {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

export function isKeepMarker(key: string): boolean {
  return basename(key) === EMPTY_FOLDER_MARKER;
}

export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";
  const cleaned = base.trim();
  if (!cleaned || cleaned === "." || cleaned === ".." || cleaned === EMPTY_FOLDER_MARKER) return "file";
  return cleaned;
}

export function galleryFolderLabel(prefix: string, name: string): string {
  return GALLERY_FOLDER_LABELS[normalizePrefix(prefix)] ?? name;
}

export function galleryBreadcrumbs(prefix: string): { prefix: string; label: string }[] {
  const normalized = normalizePrefix(prefix);
  const crumbs = [{ prefix: GALLERY_ROOT_PREFIX, label: "ریشه" }];
  if (normalized === GALLERY_ROOT_PREFIX) return crumbs;
  const rest = normalized.slice(GALLERY_ROOT_PREFIX.length).replace(/\/$/, "");
  let acc = GALLERY_ROOT_PREFIX;
  for (const part of rest.split("/")) {
    if (!part) continue;
    acc += `${part}/`;
    crumbs.push({ prefix: acc, label: galleryFolderLabel(acc, part) });
  }
  return crumbs;
}

export function autoRenameCandidate(filename: string, taken: number = 1): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const ext = dot > 0 ? filename.slice(dot) : "";
  return `${stem}-${taken}${ext}`;
}

export function validateFolderName(name: string): { ok: true; name: string } | { ok: false; message: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "نام پوشه نباید خالی باشد" };
  if (trimmed.includes("/")) return { ok: false, message: "نام پوشه نباید شامل / باشد" };
  if (trimmed === "." || trimmed === ".." || trimmed === EMPTY_FOLDER_MARKER) {
    return { ok: false, message: "نام پوشه مجاز نیست" };
  }
  return { ok: true, name: trimmed };
}

function fail(status: number, code: GalleryFoldersErrorCode, message: string, objectCount?: number): never {
  throw new GalleryFoldersError(status, code, message, objectCount);
}

function cloneRecords(records: readonly GalleryObjectRecord[]): GalleryObjectRecord[] {
  return records.map((record) => ({ ...record }));
}

function folderExists(objects: readonly GalleryObjectRecord[], prefix: string): boolean {
  if (prefix === GALLERY_ROOT_PREFIX) return true;
  return objects.some((item) => item.key.startsWith(prefix));
}

function nonMarkerCount(objects: readonly GalleryObjectRecord[], prefix: string): number {
  return objects.filter((item) => item.key.startsWith(prefix) && !isKeepMarker(item.key)).length;
}

function compareFolders(a: { name: string }, b: { name: string }): number {
  const ia = KNOWN_FOLDER_ORDER.indexOf(a.name);
  const ib = KNOWN_FOLDER_ORDER.indexOf(b.name);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  return a.name.localeCompare(b.name, "fa");
}

function toBrowseFile(record: GalleryObjectRecord): GalleryBrowseFile {
  return {
    id: record.id,
    key: record.key,
    name: basename(record.key),
    size: record.size,
    contentType: record.contentType,
    updatedAt: record.updatedAt,
    url: record.url,
  };
}

function marker(prefix: string): GalleryObjectRecord {
  return {
    key: `${prefix}${EMPTY_FOLDER_MARKER}`,
    id: null,
    size: 0,
    contentType: "application/octet-stream",
    updatedAt: new Date().toISOString(),
    url: "",
  };
}

function ensureEmptyMarker(objects: GalleryObjectRecord[], prefix: string) {
  if (!prefix || prefix === GALLERY_ROOT_PREFIX) return;
  if (objects.some((item) => item.key.startsWith(prefix))) return;
  objects.push(marker(prefix));
}

function fileParent(key: string): string {
  return key.slice(0, key.length - basename(key).length);
}

function nextAutoName(prefix: string, filename: string, taken: Set<string>): string {
  let n = 1;
  let candidate = autoRenameCandidate(filename, n);
  while (taken.has(prefix + candidate)) {
    n += 1;
    candidate = autoRenameCandidate(filename, n);
  }
  return candidate;
}

function nextId(): string {
  return `gal_${Math.random().toString(36).slice(2, 10)}`;
}

export function browseGallery(objects: readonly GalleryObjectRecord[], prefix: string): GalleryBrowseResult {
  const currentPrefix = normalizePrefix(prefix);
  const folders = new Map<string, GalleryFolderEntry>();
  const files: GalleryBrowseFile[] = [];

  for (const item of objects) {
    if (!item.key.startsWith(currentPrefix)) continue;
    const rest = item.key.slice(currentPrefix.length);
    if (!rest) continue;
    const slash = rest.indexOf("/");
    if (slash === -1) {
      if (isKeepMarker(item.key)) continue;
      files.push(toBrowseFile(item));
      continue;
    }
    const name = rest.slice(0, slash);
    const folderPrefix = `${currentPrefix}${name}/`;
    if (!folders.has(folderPrefix)) {
      folders.set(folderPrefix, {
        name,
        prefix: folderPrefix,
        objectCount: nonMarkerCount(objects, folderPrefix),
      });
    }
  }

  const folderList = [...folders.values()].sort(compareFolders);
  files.sort((a, b) => a.name.localeCompare(b.name, "en"));

  return {
    currentPrefix,
    parentPrefix: parentPrefixOf(currentPrefix),
    folders: folderList,
    files,
    counts: { folders: folderList.length, files: files.length },
  };
}

export function createFolderRecord(
  objects: readonly GalleryObjectRecord[],
  body: GalleryCreateFolderBody,
): { objects: GalleryObjectRecord[]; folder: GalleryCreateFolderResult } {
  const valid = validateFolderName(body.name);
  if (!valid.ok) fail(400, "VALIDATION", valid.message);
  const parentPrefix = normalizePrefix(body.parentPrefix);
  const prefix = `${parentPrefix}${valid.name}/`;
  if (folderExists(objects, prefix)) fail(409, "FOLDER_EXISTS", FOLDER_EXISTS_MESSAGE);
  return {
    objects: [...cloneRecords(objects), marker(prefix)],
    folder: { prefix, name: valid.name },
  };
}

export function renameFolderRecord(
  objects: readonly GalleryObjectRecord[],
  body: GalleryRenameFolderBody,
): { objects: GalleryObjectRecord[]; result: GalleryRenameFolderResult } {
  const fromPrefix = normalizePrefix(body.fromPrefix);
  if (fromPrefix === GALLERY_ROOT_PREFIX) fail(400, "VALIDATION", "ریشه قابل تغییر نام نیست");
  if (!folderExists(objects, fromPrefix)) fail(404, "NOT_FOUND", "پوشه پیدا نشد");

  let toPrefix: string;
  if (body.toPrefix?.trim()) {
    toPrefix = normalizePrefix(body.toPrefix);
  } else {
    const valid = validateFolderName(body.toName ?? "");
    if (!valid.ok) fail(400, "VALIDATION", valid.message);
    const parent = parentPrefixOf(fromPrefix);
    if (!parent) fail(400, "VALIDATION", "ریشه قابل تغییر نام نیست");
    toPrefix = `${parent}${valid.name}/`;
  }

  if (toPrefix === fromPrefix) {
    return { objects: cloneRecords(objects), result: { fromPrefix, toPrefix, movedCount: 0 } };
  }
  if (toPrefix.startsWith(fromPrefix)) fail(400, "VALIDATION", "پوشه را نمی‌توان به زیرمجموعه خودش منتقل کرد");
  if (folderExists(objects, toPrefix)) fail(409, "FOLDER_EXISTS", FOLDER_EXISTS_MESSAGE);

  let movedCount = 0;
  const next = objects.map((item) => {
    if (!item.key.startsWith(fromPrefix)) return { ...item };
    movedCount += 1;
    return { ...item, key: toPrefix + item.key.slice(fromPrefix.length) };
  });
  return { objects: next, result: { fromPrefix, toPrefix, movedCount } };
}

export function deleteFolderRecord(objects: readonly GalleryObjectRecord[], prefixRaw: string): GalleryObjectRecord[] {
  const prefix = normalizePrefix(prefixRaw);
  if (prefix === GALLERY_ROOT_PREFIX) fail(400, "VALIDATION", "ریشه قابل حذف نیست");
  if (!folderExists(objects, prefix)) fail(404, "NOT_FOUND", "پوشه پیدا نشد");
  const blocking = objects.filter((item) => item.key.startsWith(prefix) && item.key !== `${prefix}${EMPTY_FOLDER_MARKER}`);
  if (blocking.length > 0) {
    const files = blocking.filter((item) => !isKeepMarker(item.key)).length;
    fail(409, "FOLDER_NOT_EMPTY", FOLDER_NOT_EMPTY_MESSAGE, files || blocking.length);
  }
  return objects.filter((item) => !item.key.startsWith(prefix)).map((item) => ({ ...item }));
}

const CONFLICTS: readonly GalleryOnConflict[] = ["replace", "autoRename", "skip"];

export function moveObjectRecords(
  objects: readonly GalleryObjectRecord[],
  body: GalleryMoveObjectsBody,
): { objects: GalleryObjectRecord[]; result: GalleryMoveResult } {
  const destinationPrefix = normalizePrefix(body.destinationPrefix);
  if (!body.keys.length) fail(400, "VALIDATION", "فایلی انتخاب نشده است");
  if (!CONFLICTS.includes(body.onConflict)) fail(400, "VALIDATION", "نحوه برخورد با تداخل نامعتبر است");
  if (!folderExists(objects, destinationPrefix)) fail(404, "NOT_FOUND", "پوشه مقصد پیدا نشد");

  const next = cloneRecords(objects);
  const taken = new Set(next.map((item) => item.key));
  const moved: string[] = [];
  const skipped: string[] = [];
  const renamed: string[] = [];

  for (const key of body.keys) {
    const source = next.find((item) => item.key === key);
    if (!source || isKeepMarker(key)) fail(404, "NOT_FOUND", "فایل پیدا نشد");
    const parent = fileParent(key);
    if (parent === destinationPrefix) {
      skipped.push(key);
      continue;
    }
    const name = basename(key);
    let destKey = destinationPrefix + name;
    if (taken.has(destKey)) {
      if (body.onConflict === "skip") {
        skipped.push(key);
        continue;
      }
      if (body.onConflict === "autoRename") {
        destKey = destinationPrefix + nextAutoName(destinationPrefix, name, taken);
        taken.delete(key);
        taken.add(destKey);
        source.key = destKey;
        renamed.push(destKey);
        ensureEmptyMarker(next, parent);
        continue;
      }
      const destIndex = next.findIndex((item) => item.key === destKey);
      if (destIndex !== -1) next.splice(destIndex, 1);
      taken.delete(destKey);
      taken.delete(key);
      source.key = destKey;
      taken.add(destKey);
      moved.push(destKey);
      ensureEmptyMarker(next, parent);
      continue;
    }
    taken.delete(key);
    source.key = destKey;
    taken.add(destKey);
    moved.push(destKey);
    ensureEmptyMarker(next, parent);
  }

  return { objects: next, result: { moved, skipped, renamed } };
}

export function presignFolderUpload(body: GalleryFolderPresignBody): GalleryPresign {
  if (!body.filename.trim()) fail(400, "VALIDATION", "نام فایل لازم است");
  if (!Number.isFinite(body.size) || body.size < 0) fail(400, "VALIDATION", "اندازه فایل نامعتبر است");
  const prefix = normalizePrefix(body.prefix);
  const filename = sanitizeFilename(body.filename);
  const key = `${prefix}${filename}`;
  return {
    uploadUrl: `stub://gallery-upload/${encodeURIComponent(key)}`,
    headers: body.mime ? { "Content-Type": body.mime } : {},
    key,
    publicUrl: "",
    provider: "stub",
  };
}

export function registerObjectRecord(
  objects: readonly GalleryObjectRecord[],
  body: GalleryRegisterInput,
): { objects: GalleryObjectRecord[]; file: GalleryBrowseFile } {
  if (!body.key) fail(400, "VALIDATION", "کلید فایل لازم است");
  const existing = objects.find((item) => item.key === body.key);
  const record: GalleryObjectRecord = {
    key: body.key,
    id: existing?.id ?? nextId(),
    size: body.size,
    contentType: body.mimeType,
    updatedAt: new Date().toISOString(),
    url: body.publicUrl,
  };
  const next = existing
    ? objects.map((item) => (item.key === body.key ? record : { ...item }))
    : [...cloneRecords(objects), record];
  return { objects: next, file: toBrowseFile(record) };
}

export function deleteObjectRecord(objects: readonly GalleryObjectRecord[], id: string): GalleryObjectRecord[] {
  const found = objects.find((item) => item.id === id);
  if (!found) fail(404, "NOT_FOUND", "فایل پیدا نشد");
  const parent = fileParent(found.key);
  const next = objects.filter((item) => item.id !== id).map((item) => ({ ...item }));
  ensureEmptyMarker(next, parent);
  return next;
}

function image(key: string, id: string, size: number, contentType = "image/jpeg"): GalleryObjectRecord {
  return { key, id, size, contentType, updatedAt: SEED_UPDATED_AT, url: "" };
}

/** Seeded library matching the ANG-A6 filled tree (۱۸ فایل، پوشه خالی با `.keep`). */
export function seedGalleryObjects(): GalleryObjectRecord[] {
  return [
    image("gallery/hero-1.jpg", "file-root-1", 180224),
    image("gallery/hero-2.jpg", "file-root-2", 190464),
    image("gallery/hero-3.jpg", "file-root-3", 200704),
    image("gallery/hero-4.jpg", "file-root-4", 210944),
    image("gallery/rings/band.jpg", "file-rings-band", 221184),
    image("gallery/rings/set.jpg", "file-rings-set", 231424),
    image("gallery/rings/red/red-solitaire.jpg", "file-red-solitaire", 245760),
    image("gallery/rings/red/red-side.jpg", "file-red-side", 188 * 1024),
    image("gallery/rings/red/red-detail.jpg", "file-red-detail", 312 * 1024),
    image("gallery/rings/red/red-box.jpg", "file-red-box", 154 * 1024),
    image("gallery/rings/engagement/engagement-1.jpg", "file-engagement-1", 204800),
    image("gallery/rings/engagement/engagement-2.jpg", "file-engagement-2", 215040),
    image("gallery/rings/engagement/red-solitaire.jpg", "file-engagement-solitaire", 225280),
    image("gallery/products/solitaire/solitaire-1.jpg", "file-solitaire-1", 235520),
    image("gallery/products/solitaire/solitaire-2.jpg", "file-solitaire-2", 245760),
    image("gallery/products/solitaire/solitaire-3.jpg", "file-solitaire-3", 256000),
    image("gallery/products/solitaire/solitaire-4.jpg", "file-solitaire-4", 266240),
    image("gallery/products/solitaire/solitaire-spin.mp4", "file-solitaire-video", 4_000_000, "video/mp4"),
    marker("gallery/archive/"),
  ];
}

export function createGalleryFoldersStub(initial?: readonly GalleryObjectRecord[]): GalleryFoldersClient {
  let objects = cloneRecords(initial ?? seedGalleryObjects());
  return {
    async browse(query) {
      return browseGallery(objects, query.prefix);
    },
    async createFolder(body) {
      const outcome = createFolderRecord(objects, body);
      objects = outcome.objects;
      return outcome.folder;
    },
    async renameFolder(body) {
      const outcome = renameFolderRecord(objects, renameFolderBody(body));
      objects = outcome.objects;
      return outcome.result;
    },
    async deleteFolder(query) {
      objects = deleteFolderRecord(objects, query.prefix);
    },
    async moveObjects(body) {
      const outcome = moveObjectRecords(objects, body);
      objects = outcome.objects;
      return outcome.result;
    },
    async presign(body) {
      return presignFolderUpload(folderPresignBody(body));
    },
    async register(body) {
      const outcome = registerObjectRecord(objects, body);
      objects = outcome.objects;
      return outcome.file;
    },
    async deleteObject(id) {
      objects = deleteObjectRecord(objects, id);
    },
  };
}

let singleton: GalleryFoldersClient | null = null;

/** Stub today. Replace this body with a Nest adapter that uses the path helpers above. */
export function getGalleryFoldersClient(): GalleryFoldersClient {
  singleton ??= createGalleryFoldersStub();
  return singleton;
}

export async function loadGalleryFolderTree(client: GalleryFoldersClient): Promise<GalleryFolderNode> {
  async function walk(prefix: string, name: string): Promise<GalleryFolderNode> {
    const page = await client.browse({ prefix, delimiter: GALLERY_DELIMITER });
    const children = await Promise.all(page.folders.map((folder) => walk(folder.prefix, folder.name)));
    return {
      prefix,
      name,
      label: prefix === GALLERY_ROOT_PREFIX ? "همه فایل‌ها" : galleryFolderLabel(prefix, name),
      objectCount: page.files.length + page.folders.reduce((sum, folder) => sum + folder.objectCount, 0),
      children,
    };
  }
  return walk(GALLERY_ROOT_PREFIX, "gallery");
}

export const GALLERY_FOLDERS_NEST_PATHS = {
  browse: GALLERY_BROWSE_PATH,
  createFolder: GALLERY_FOLDERS_PATH,
  renameFolder: GALLERY_FOLDERS_RENAME_PATH,
  deleteFolder: GALLERY_FOLDERS_PATH,
  moveObjects: GALLERY_OBJECTS_MOVE_PATH,
  presign: GALLERY_PRESIGN_PATH,
} as const;
