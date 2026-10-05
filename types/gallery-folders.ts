import type { GalleryPresign, GalleryRegisterInput } from "@/types/gallery";

/**
 * ANG-A6 Nest contract under `/gallery` (admin JWT).
 * These shapes are what a later Nest adapter must send and accept.
 * This PR does not call Nest — the in-memory stub implements the same interface.
 */

export const GALLERY_ROOT_PREFIX = "gallery/";
export const GALLERY_DELIMITER = "/" as const;
export const EMPTY_FOLDER_MARKER = ".keep";

/** Primary filled screen in the ANG-A6 mockup. Used when `?prefix=` is absent. */
export const DEFAULT_GALLERY_PREFIX = "gallery/rings/red/";

export const GALLERY_BROWSE_PATH = "/gallery/browse";
export const GALLERY_FOLDERS_PATH = "/gallery/folders";
export const GALLERY_FOLDERS_RENAME_PATH = "/gallery/folders/rename";
export const GALLERY_OBJECTS_MOVE_PATH = "/gallery/objects/move";
export const GALLERY_PRESIGN_PATH = "/gallery/presign";
export const GALLERY_REGISTER_PATH = "/gallery";

export const FOLDER_EXISTS_MESSAGE = "پوشه‌ای با این نام وجود دارد";
export const FOLDER_NOT_EMPTY_MESSAGE = "پوشه خالی نیست؛ ابتدا فایل‌ها را جابه‌جا یا حذف کنید";

export type GalleryFoldersErrorCode =
  | "VALIDATION"
  | "FOLDER_EXISTS"
  | "FOLDER_NOT_EMPTY"
  | "OBJECT_EXISTS"
  | "NOT_FOUND";

export type GalleryFolderEntry = {
  name: string;
  prefix: string;
  objectCount: number;
};

/** One file at the current level. `.keep` markers are omitted. `id` is null until the object is registered. */
export type GalleryBrowseFile = {
  id: string | null;
  key: string;
  name: string;
  size: number;
  contentType: string;
  updatedAt: string;
  url: string;
};

/** `GET /gallery/browse?prefix=&delimiter=/` */
export type GalleryBrowseResult = {
  currentPrefix: string;
  parentPrefix: string | null;
  folders: GalleryFolderEntry[];
  files: GalleryBrowseFile[];
  counts: { folders: number; files: number };
};

export type GalleryBrowseQuery = {
  prefix: string;
  delimiter?: typeof GALLERY_DELIMITER;
};

/** `POST /gallery/folders` */
export type GalleryCreateFolderBody = {
  parentPrefix: string;
  name: string;
};

export type GalleryCreateFolderResult = {
  prefix: string;
  name: string;
};

/** `POST /gallery/folders/rename` — `toName` (sibling rename) or absolute `toPrefix`. */
export type GalleryRenameFolderBody = {
  fromPrefix: string;
  toName?: string;
  toPrefix?: string;
};

export type GalleryRenameFolderResult = {
  fromPrefix: string;
  toPrefix: string;
  movedCount: number;
};

export type GalleryOnConflict = "replace" | "autoRename" | "skip";

/** `POST /gallery/objects/move` */
export type GalleryMoveObjectsBody = {
  keys: string[];
  destinationPrefix: string;
  onConflict: GalleryOnConflict;
};

/**
 * Destination keys in `moved` and `renamed`. Source keys left in place in `skipped`.
 * Auto-renamed objects are only listed in `renamed`.
 */
export type GalleryMoveResult = {
  moved: string[];
  skipped: string[];
  renamed: string[];
};

/**
 * `POST /gallery/presign` — today's Nest body (`filename`, `mime`, `size`) plus `prefix`.
 * Final key is `prefix + sanitizedFilename`.
 */
export type GalleryFolderPresignBody = {
  filename: string;
  mime: string;
  size: number;
  prefix: string;
};

export type GalleryFoldersClient = {
  browse(query: GalleryBrowseQuery): Promise<GalleryBrowseResult>;
  createFolder(body: GalleryCreateFolderBody): Promise<GalleryCreateFolderResult>;
  renameFolder(body: GalleryRenameFolderBody): Promise<GalleryRenameFolderResult>;
  /** `DELETE /gallery/folders?prefix=` — 204 when empty, otherwise `FOLDER_NOT_EMPTY`. */
  deleteFolder(query: { prefix: string }): Promise<void>;
  moveObjects(body: GalleryMoveObjectsBody): Promise<GalleryMoveResult>;
  presign(body: GalleryFolderPresignBody): Promise<GalleryPresign>;
  /** Existing `POST /gallery`. Stub records the object; the Nest adapter calls the current register action. */
  register(body: GalleryRegisterInput): Promise<GalleryBrowseFile>;
  /** Existing `DELETE /gallery/:id`. */
  deleteObject(id: string): Promise<void>;
};
