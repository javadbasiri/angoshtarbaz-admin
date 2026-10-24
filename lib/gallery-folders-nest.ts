"use client";

import type { ActionResult } from "@/lib/action-result";
import { ApiError } from "@/lib/api";
import { unwrapAction } from "@/lib/call-action";
import { deleteGalleryAction, registerGalleryAction } from "@/lib/gallery-actions";
import {
  browseGalleryAction,
  createGalleryFolderAction,
  deleteGalleryFolderAction,
  deleteGalleryObjectsAction,
  galleryFolderTreeAction,
  moveGalleryObjectsAction,
  presignGalleryFolderAction,
  renameGalleryFolderAction,
} from "@/lib/gallery-folder-actions";
import { browseFileFromAsset, GalleryFoldersError } from "@/lib/gallery-folders";
import { signalSessionExpired } from "@/lib/session-expired";
import type { GalleryFoldersErrorCode, GalleryFoldersClient } from "@/types/gallery-folders";

const KNOWN_CODES = new Set<GalleryFoldersErrorCode>([
  "VALIDATION",
  "FOLDER_EXISTS",
  "FOLDER_NOT_EMPTY",
  "OBJECT_EXISTS",
  "NOT_FOUND",
]);

function asFolderCode(code: string | undefined, status: number): GalleryFoldersErrorCode {
  if (code && KNOWN_CODES.has(code as GalleryFoldersErrorCode)) return code as GalleryFoldersErrorCode;
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "OBJECT_EXISTS";
  return "VALIDATION";
}

async function unwrapFolders<T>(result: ActionResult<T>): Promise<T> {
  if (result.ok) return result.data;
  if (result.status === 401) signalSessionExpired();
  throw new GalleryFoldersError(
    result.status,
    asFolderCode(result.code, result.status),
    result.message,
    result.objectCount,
  );
}

function rethrowClient(error: unknown): never {
  if (error instanceof GalleryFoldersError) throw error;
  if (error instanceof ApiError) {
    if (error.status === 401) signalSessionExpired();
    throw new GalleryFoldersError(error.status, asFolderCode(undefined, error.status), error.message);
  }
  throw new GalleryFoldersError(502, "VALIDATION", error instanceof Error ? error.message : "اتصال به بک‌اند برقرار نشد.");
}

/** Nest-backed folders client. JWT stays in the server action; the browser only PUTs presigned bytes. */
export function createGalleryFoldersNestClient(): GalleryFoldersClient {
  return {
    async browse(query) {
      return unwrapFolders(await browseGalleryAction(query.prefix));
    },
    async tree() {
      return unwrapFolders(await galleryFolderTreeAction());
    },
    async createFolder(body) {
      return unwrapFolders(await createGalleryFolderAction(body));
    },
    async renameFolder(body) {
      return unwrapFolders(await renameGalleryFolderAction(body));
    },
    async deleteFolder(query) {
      await unwrapFolders(await deleteGalleryFolderAction(query.prefix));
    },
    async moveObjects(body) {
      return unwrapFolders(await moveGalleryObjectsAction(body));
    },
    async presign(body) {
      return unwrapFolders(await presignGalleryFolderAction(body));
    },
    async register(body) {
      try {
        const asset = await unwrapAction(await registerGalleryAction(body));
        return browseFileFromAsset(asset, body);
      } catch (error) {
        rethrowClient(error);
      }
    },
    async deleteObject(id) {
      try {
        await unwrapAction(await deleteGalleryAction(id));
      } catch (error) {
        rethrowClient(error);
      }
    },
    async deleteObjects(body) {
      await unwrapFolders(await deleteGalleryObjectsAction(body));
    },
  };
}
