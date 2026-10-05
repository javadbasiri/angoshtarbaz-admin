"use server";

import { actionFail, actionOk, type ActionResult } from "@/lib/action-result";
import { callAdminBackend, type AdminCall } from "@/lib/admin-call";
import { env } from "@/lib/env";
import { extractPresign } from "@/lib/gallery";
import {
  extractBrowseGallery,
  extractCreateFolder,
  extractFolderTree,
  extractGalleryFoldersFailure,
  extractMoveResult,
  extractRenameFolder,
  folderPresignBody,
  galleryBrowsePath,
  galleryFolderDeletePath,
  renameFolderBody,
  type GalleryFolderNode,
} from "@/lib/gallery-folders";
import { browserUploadTarget } from "@/lib/gallery-upload-target";
import type { GalleryPresign } from "@/types/gallery";
import {
  GALLERY_FOLDERS_PATH,
  GALLERY_FOLDERS_RENAME_PATH,
  GALLERY_OBJECTS_MOVE_PATH,
  GALLERY_OBJECTS_PATH,
  GALLERY_PRESIGN_PATH,
  GALLERY_TREE_PATH,
  type GalleryBrowseResult,
  type GalleryCreateFolderBody,
  type GalleryCreateFolderResult,
  type GalleryDeleteObjectsBody,
  type GalleryFolderPresignBody,
  type GalleryMoveObjectsBody,
  type GalleryMoveResult,
  type GalleryRenameFolderBody,
  type GalleryRenameFolderResult,
} from "@/types/gallery-folders";

function fromCall<T>(call: AdminCall, onOk: (body: unknown) => ActionResult<T>, fallback: string): ActionResult<T> {
  if (call.kind === "unauthorized") return actionFail(401, call.message);
  if (call.kind === "offline") return actionFail(502, "اتصال به بک‌اند برقرار نشد.");
  if (call.kind === "http") {
    const failure = extractGalleryFoldersFailure(call.status, call.body, fallback);
    return actionFail(failure.status, failure.message, {
      code: failure.code,
      objectCount: failure.objectCount,
    });
  }
  return onOk(call.body);
}

export async function browseGalleryAction(prefix: string): Promise<ActionResult<GalleryBrowseResult>> {
  const call = await callAdminBackend(galleryBrowsePath(prefix), { method: "GET" });
  return fromCall(
    call,
    (body) => {
      const listed = extractBrowseGallery(body, prefix);
      if (!listed) return actionFail(502, "پاسخ فهرست پوشه ناقص است.");
      return actionOk(listed);
    },
    "بارگذاری پوشه ناموفق بود.",
  );
}

/** `null` when Nest has no tree route or the body is not a tree. The UI then walks browse. */
export async function galleryFolderTreeAction(): Promise<ActionResult<GalleryFolderNode | null>> {
  const call = await callAdminBackend(GALLERY_TREE_PATH, { method: "GET" });
  if (call.kind === "http" && (call.status === 404 || call.status === 405 || call.status === 501)) {
    return actionOk(null);
  }
  return fromCall(call, (body) => actionOk(extractFolderTree(body)), "بارگذاری درخت پوشه ناموفق بود.");
}

export async function createGalleryFolderAction(
  body: GalleryCreateFolderBody,
): Promise<ActionResult<GalleryCreateFolderResult>> {
  const call = await callAdminBackend(GALLERY_FOLDERS_PATH, {
    method: "POST",
    body: JSON.stringify({ parentPrefix: body.parentPrefix, name: body.name }),
  });
  return fromCall(
    call,
    (raw) => {
      const created = extractCreateFolder(raw);
      if (!created) return actionFail(502, "پاسخ ساخت پوشه ناقص است.");
      return actionOk(created);
    },
    "ساخت پوشه ناموفق بود.",
  );
}

export async function renameGalleryFolderAction(
  body: GalleryRenameFolderBody,
): Promise<ActionResult<GalleryRenameFolderResult>> {
  const call = await callAdminBackend(GALLERY_FOLDERS_RENAME_PATH, {
    method: "POST",
    body: JSON.stringify(renameFolderBody(body)),
  });
  return fromCall(
    call,
    (raw) => {
      const renamed = extractRenameFolder(raw);
      if (!renamed) return actionFail(502, "پاسخ تغییر نام پوشه ناقص است.");
      return actionOk(renamed);
    },
    "تغییر نام پوشه ناموفق بود.",
  );
}

export async function deleteGalleryFolderAction(prefix: string): Promise<ActionResult<{ ok: true }>> {
  const call = await callAdminBackend(galleryFolderDeletePath(prefix), { method: "DELETE" });
  return fromCall(call, () => actionOk({ ok: true }), "حذف پوشه ناموفق بود.");
}

export async function moveGalleryObjectsAction(body: GalleryMoveObjectsBody): Promise<ActionResult<GalleryMoveResult>> {
  const call = await callAdminBackend(GALLERY_OBJECTS_MOVE_PATH, {
    method: "POST",
    body: JSON.stringify({
      keys: body.keys,
      destinationPrefix: body.destinationPrefix,
      onConflict: body.onConflict,
    }),
  });
  return fromCall(
    call,
    (raw) => {
      const moved = extractMoveResult(raw);
      if (!moved) return actionFail(502, "پاسخ جابه‌جایی ناقص است.");
      return actionOk(moved);
    },
    "جابه‌جایی فایل ناموفق بود.",
  );
}

export async function deleteGalleryObjectsAction(body: GalleryDeleteObjectsBody): Promise<ActionResult<{ ok: true }>> {
  const call = await callAdminBackend(GALLERY_OBJECTS_PATH, {
    method: "DELETE",
    body: JSON.stringify({ keys: body.keys }),
  });
  return fromCall(call, () => actionOk({ ok: true }), "حذف فایل‌ها ناموفق بود.");
}

export async function presignGalleryFolderAction(input: GalleryFolderPresignBody): Promise<ActionResult<GalleryPresign>> {
  const call = await callAdminBackend(GALLERY_PRESIGN_PATH, {
    method: "POST",
    body: JSON.stringify(folderPresignBody(input)),
  });
  return fromCall(
    call,
    (body) => {
      const presign = extractPresign(body);
      if (!presign) return actionFail(502, "پاسخ presign گالری ناقص است.");
      const target = browserUploadTarget(presign, env.apiUrl);
      return actionOk({ ...presign, uploadUrl: target.url, headers: target.headers });
    },
    "دریافت لینک آپلود ناموفق بود.",
  );
}
