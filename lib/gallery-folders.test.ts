import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { galleryFoldersEnabled } from "./env.ts";
import {
  GalleryFoldersError,
  browseGallery,
  createGalleryFoldersStub,
  folderPresignBody,
  galleryBrowsePath,
  galleryBreadcrumbs,
  galleryFolderDeletePath,
  galleryObjectDeletePath,
  renameFolderBody,
  seedGalleryObjects,
} from "./gallery-folders.ts";
import {
  FOLDER_EXISTS_MESSAGE,
  FOLDER_NOT_EMPTY_MESSAGE,
  GALLERY_BROWSE_PATH,
  GALLERY_FOLDERS_PATH,
  GALLERY_FOLDERS_RENAME_PATH,
  GALLERY_OBJECTS_MOVE_PATH,
  GALLERY_PRESIGN_PATH,
} from "../types/gallery-folders.ts";

describe("galleryFoldersEnabled", () => {
  it("is off unless the flag is 1 or true", () => {
    assert.equal(galleryFoldersEnabled(undefined), false);
    assert.equal(galleryFoldersEnabled(""), false);
    assert.equal(galleryFoldersEnabled("   "), false);
    assert.equal(galleryFoldersEnabled("0"), false);
    assert.equal(galleryFoldersEnabled("yes"), false);
    assert.equal(galleryFoldersEnabled("1"), true);
    assert.equal(galleryFoldersEnabled(" 1 "), true);
    assert.equal(galleryFoldersEnabled("true"), true);
    assert.equal(galleryFoldersEnabled("TRUE"), true);
  });
});

describe("Nest path helpers", () => {
  it("builds the confirmed /gallery routes, not /media", () => {
    assert.equal(GALLERY_BROWSE_PATH, "/gallery/browse");
    assert.equal(GALLERY_FOLDERS_PATH, "/gallery/folders");
    assert.equal(GALLERY_FOLDERS_RENAME_PATH, "/gallery/folders/rename");
    assert.equal(GALLERY_OBJECTS_MOVE_PATH, "/gallery/objects/move");
    assert.equal(GALLERY_PRESIGN_PATH, "/gallery/presign");
    assert.equal(
      galleryBrowsePath("gallery/rings/"),
      "/gallery/browse?prefix=gallery%2Frings%2F&delimiter=/",
    );
    assert.equal(galleryFolderDeletePath("gallery/archive/"), "/gallery/folders?prefix=gallery%2Farchive%2F");
    assert.equal(galleryObjectDeletePath("file-red-solitaire"), "/gallery/file-red-solitaire");
  });

  it("adds prefix to the existing presign fields", () => {
    const body = folderPresignBody({
      filename: "macro.jpg",
      mime: "image/jpeg",
      size: 120000,
      prefix: "gallery/rings/red/",
    });
    assert.deepEqual(body, {
      filename: "macro.jpg",
      mime: "image/jpeg",
      size: 120000,
      prefix: "gallery/rings/red/",
    });
    assert.deepEqual(Object.keys(body), ["filename", "mime", "size", "prefix"]);
  });

  it("sends toName or toPrefix, not both", () => {
    assert.deepEqual(renameFolderBody({ fromPrefix: "gallery/rings/red/", toName: "قرمز یاقوتی" }), {
      fromPrefix: "gallery/rings/red/",
      toName: "قرمز یاقوتی",
    });
    assert.deepEqual(
      renameFolderBody({ fromPrefix: "gallery/rings/red/", toName: "ignored", toPrefix: "gallery/rings/ruby/" }),
      { fromPrefix: "gallery/rings/red/", toPrefix: "gallery/rings/ruby/" },
    );
  });
});

describe("gallery folders stub", () => {
  it("lists one level, hides .keep, and counts like the filled mockup", async () => {
    const client = createGalleryFoldersStub();
    const root = await client.browse({ prefix: "gallery/", delimiter: "/" });
    assert.equal(root.currentPrefix, "gallery/");
    assert.equal(root.parentPrefix, null);
    assert.deepEqual(
      root.folders.map((folder) => [folder.name, folder.objectCount]),
      [
        ["rings", 9],
        ["products", 5],
        ["archive", 0],
      ],
    );
    assert.equal(root.counts.files, 4);
    assert.equal(root.files.some((file) => file.name === ".keep"), false);

    const red = await client.browse({ prefix: "gallery/rings/red", delimiter: "/" });
    assert.equal(red.currentPrefix, "gallery/rings/red/");
    assert.equal(red.parentPrefix, "gallery/rings/");
    assert.deepEqual(
      red.files.map((file) => file.name),
      ["red-box.jpg", "red-detail.jpg", "red-side.jpg", "red-solitaire.jpg"],
    );
    assert.equal(red.files[0]?.id, "file-red-box");
    assert.equal(red.counts.folders, 0);

    const archive = await client.browse({ prefix: "gallery/archive/", delimiter: "/" });
    assert.equal(archive.counts.files, 0);
    assert.equal(archive.counts.folders, 0);
    assert.equal(seedGalleryObjects().some((item) => item.key === "gallery/archive/.keep"), true);

    const treeTotal =
      root.files.length + root.folders.reduce((sum, folder) => sum + folder.objectCount, 0);
    assert.equal(treeTotal, 18);
  });

  it("creates a folder with a zero-byte .keep and rejects conflicts in Persian", async () => {
    const client = createGalleryFoldersStub();
    const created = await client.createFolder({ parentPrefix: "gallery/rings/red/", name: "  نامزدی  " });
    assert.deepEqual(created, { prefix: "gallery/rings/red/نامزدی/", name: "نامزدی" });
    const listed = await client.browse({ prefix: "gallery/rings/red/", delimiter: "/" });
    assert.equal(listed.folders.some((folder) => folder.name === "نامزدی"), true);
    assert.equal(listed.files.some((file) => file.name === ".keep"), false);

    await assert.rejects(
      () => client.createFolder({ parentPrefix: "gallery/rings/", name: "red" }),
      (error: unknown) => {
        assert.ok(error instanceof GalleryFoldersError);
        assert.equal(error.status, 409);
        assert.equal(error.code, "FOLDER_EXISTS");
        assert.equal(error.message, FOLDER_EXISTS_MESSAGE);
        return true;
      },
    );

    await assert.rejects(
      () => client.createFolder({ parentPrefix: "gallery/", name: "a/b" }),
      (error: unknown) => {
        assert.ok(error instanceof GalleryFoldersError);
        assert.equal(error.status, 400);
        assert.equal(error.code, "VALIDATION");
        return true;
      },
    );
  });

  it("renames a prefix and reports a conflict", async () => {
    const client = createGalleryFoldersStub();
    const renamed = await client.renameFolder({ fromPrefix: "gallery/rings/red/", toName: "قرمز یاقوتی" });
    assert.equal(renamed.fromPrefix, "gallery/rings/red/");
    assert.equal(renamed.toPrefix, "gallery/rings/قرمز یاقوتی/");
    assert.ok(renamed.movedCount >= 4);
    const moved = await client.browse({ prefix: renamed.toPrefix, delimiter: "/" });
    assert.equal(moved.files.some((file) => file.name === "red-solitaire.jpg"), true);
    assert.equal((await client.browse({ prefix: "gallery/rings/red/", delimiter: "/" })).counts.files, 0);

    await assert.rejects(
      () => client.renameFolder({ fromPrefix: "gallery/rings/engagement/", toPrefix: "gallery/products/" }),
      (error: unknown) => {
        assert.ok(error instanceof GalleryFoldersError);
        assert.equal(error.code, "FOLDER_EXISTS");
        assert.equal(error.message, FOLDER_EXISTS_MESSAGE);
        return true;
      },
    );
  });

  it("deletes only an empty folder and blocks a non-empty one with a count", async () => {
    const client = createGalleryFoldersStub();
    await assert.rejects(
      () => client.deleteFolder({ prefix: "gallery/rings/red/" }),
      (error: unknown) => {
        assert.ok(error instanceof GalleryFoldersError);
        assert.equal(error.status, 409);
        assert.equal(error.code, "FOLDER_NOT_EMPTY");
        assert.equal(error.message, FOLDER_NOT_EMPTY_MESSAGE);
        assert.equal(error.objectCount, 4);
        return true;
      },
    );

    await client.deleteFolder({ prefix: "gallery/archive/" });
    const root = await client.browse({ prefix: "gallery/", delimiter: "/" });
    assert.equal(root.folders.some((folder) => folder.prefix === "gallery/archive/"), false);
  });

  it("moves with replace, autoRename, and skip", async () => {
    const replaceClient = createGalleryFoldersStub();
    const replaced = await replaceClient.moveObjects({
      keys: ["gallery/rings/red/red-solitaire.jpg", "gallery/rings/red/red-side.jpg"],
      destinationPrefix: "gallery/rings/engagement/",
      onConflict: "replace",
    });
    assert.deepEqual(replaced.moved.sort(), [
      "gallery/rings/engagement/red-side.jpg",
      "gallery/rings/engagement/red-solitaire.jpg",
    ]);
    assert.deepEqual(replaced.renamed, []);
    const engagement = await replaceClient.browse({ prefix: "gallery/rings/engagement/", delimiter: "/" });
    const solitaire = engagement.files.filter((file) => file.name === "red-solitaire.jpg");
    assert.equal(solitaire.length, 1);
    assert.equal(solitaire[0]?.id, "file-red-solitaire");

    const renameClient = createGalleryFoldersStub();
    const renamed = await renameClient.moveObjects({
      keys: ["gallery/rings/red/red-solitaire.jpg"],
      destinationPrefix: "gallery/rings/engagement/",
      onConflict: "autoRename",
    });
    assert.deepEqual(renamed.renamed, ["gallery/rings/engagement/red-solitaire-1.jpg"]);
    assert.deepEqual(renamed.moved, []);
    const both = await renameClient.browse({ prefix: "gallery/rings/engagement/", delimiter: "/" });
    assert.equal(both.files.some((file) => file.name === "red-solitaire.jpg"), true);
    assert.equal(both.files.some((file) => file.name === "red-solitaire-1.jpg"), true);

    const skipClient = createGalleryFoldersStub();
    const skipped = await skipClient.moveObjects({
      keys: ["gallery/rings/red/red-solitaire.jpg", "gallery/rings/red/red-box.jpg"],
      destinationPrefix: "gallery/rings/engagement/",
      onConflict: "skip",
    });
    assert.deepEqual(skipped.skipped, ["gallery/rings/red/red-solitaire.jpg"]);
    assert.deepEqual(skipped.moved, ["gallery/rings/engagement/red-box.jpg"]);
    const red = await skipClient.browse({ prefix: "gallery/rings/red/", delimiter: "/" });
    assert.equal(red.files.some((file) => file.name === "red-solitaire.jpg"), true);
    assert.equal(red.files.some((file) => file.name === "red-box.jpg"), false);
  });

  it("presigns into the current prefix and omits path segments", async () => {
    const client = createGalleryFoldersStub();
    const presign = await client.presign({
      filename: "../macro.jpg",
      mime: "image/jpeg",
      size: 120000,
      prefix: "gallery/rings/red/",
    });
    assert.equal(presign.key, "gallery/rings/red/macro.jpg");
    assert.equal(presign.provider, "stub");
    assert.equal(presign.headers["Content-Type"], "image/jpeg");
    assert.match(presign.uploadUrl, /^stub:\/\//);

    const registered = await client.register({
      key: presign.key,
      publicUrl: "blob:preview",
      filename: "macro.jpg",
      mimeType: "image/jpeg",
      size: 120000,
    });
    assert.equal(registered.name, "macro.jpg");
    assert.equal(registered.key, "gallery/rings/red/macro.jpg");
    const red = await client.browse({ prefix: "gallery/rings/red/", delimiter: "/" });
    assert.equal(red.files.some((file) => file.name === "macro.jpg"), true);
  });

  it("keeps an emptied folder via .keep after the last file is deleted", async () => {
    const client = createGalleryFoldersStub();
    const archive = await client.browse({ prefix: "gallery/archive/", delimiter: "/" });
    assert.equal(archive.counts.files, 0);
    await client.deleteObject("file-red-solitaire");
    await client.deleteObject("file-red-side");
    await client.deleteObject("file-red-detail");
    await client.deleteObject("file-red-box");
    const red = await client.browse({ prefix: "gallery/rings/", delimiter: "/" });
    assert.equal(red.folders.some((folder) => folder.prefix === "gallery/rings/red/"), true);
    assert.equal(red.folders.find((folder) => folder.prefix === "gallery/rings/red/")?.objectCount, 0);
    await client.deleteFolder({ prefix: "gallery/rings/red/" });
  });
});

describe("galleryBreadcrumbs", () => {
  it("walks root to the current folder", () => {
    assert.deepEqual(galleryBreadcrumbs("gallery/rings/red/"), [
      { prefix: "gallery/", label: "ریشه" },
      { prefix: "gallery/rings/", label: "حلقه‌ها" },
      { prefix: "gallery/rings/red/", label: "قرمز" },
    ]);
  });
});

describe("browseGallery direct", () => {
  it("does not include nested files at the parent level", () => {
    const page = browseGallery(seedGalleryObjects(), "gallery/rings/");
    assert.deepEqual(
      page.files.map((file) => file.name).sort(),
      ["band.jpg", "set.jpg"],
    );
    assert.equal(page.files.some((file) => file.name === "red-solitaire.jpg"), false);
  });
});
