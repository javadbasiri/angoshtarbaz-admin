"use client";

import { env } from "@/lib/env";
import { createGalleryFoldersStub, loadGalleryFolderTree, type GalleryFolderNode } from "@/lib/gallery-folders";
import { createGalleryFoldersNestClient } from "@/lib/gallery-folders-nest";
import type { GalleryFoldersClient } from "@/types/gallery-folders";

let stubSingleton: GalleryFoldersClient | null = null;
let nestSingleton: GalleryFoldersClient | null = null;

/**
 * Folder UI data source. Flag on uses Nest unless `NEXT_PUBLIC_GALLERY_FOLDERS_STUB`
 * is `1` or `true`, which keeps the in-memory demo for offline review.
 */
export function getGalleryFoldersClient(): GalleryFoldersClient {
  if (env.galleryFoldersStub) {
    stubSingleton ??= createGalleryFoldersStub();
    return stubSingleton;
  }
  nestSingleton ??= createGalleryFoldersNestClient();
  return nestSingleton;
}

/** Prefer `GET /gallery/tree`. Any miss or empty parse falls back to recursive browse. */
export async function loadFoldersTree(client: GalleryFoldersClient): Promise<GalleryFolderNode> {
  if (client.tree) {
    try {
      const node = await client.tree();
      if (node) return node;
    } catch {
      // Browse still builds the same tree when the tree route is down.
    }
  }
  return loadGalleryFolderTree(client);
}
