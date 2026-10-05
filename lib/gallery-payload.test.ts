import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractGalleryAsset, extractPresign, presignPayload, registerPayload } from "./gallery.ts";

describe("presignPayload", () => {
  it("sends filename, mime, and size only", () => {
    const body = presignPayload({
      filename: "ring.jpg",
      contentType: "image/jpeg",
      size: 123,
    });
    assert.deepEqual(body, { filename: "ring.jpg", mime: "image/jpeg", size: 123 });
    assert.deepEqual(Object.keys(body).sort(), ["filename", "mime", "size"]);
  });
});

describe("registerPayload", () => {
  it("sends url, key, mime, size, and originalName only", () => {
    const body = registerPayload({
      key: "gallery/ring.jpg",
      publicUrl: "https://cdn.example/gallery/ring.jpg",
      filename: "ring.jpg",
      mimeType: "image/jpeg",
      size: 123,
    });
    assert.deepEqual(body, {
      url: "https://cdn.example/gallery/ring.jpg",
      key: "gallery/ring.jpg",
      mime: "image/jpeg",
      size: 123,
      originalName: "ring.jpg",
    });
    assert.deepEqual(Object.keys(body).sort(), ["key", "mime", "originalName", "size", "url"]);
  });
});

describe("extractGalleryAsset", () => {
  it("accepts a Nest asset that uses mime, url, and originalName", () => {
    const asset = extractGalleryAsset({
      id: "asset-1",
      url: "https://cdn.example/gallery/ring.jpg",
      key: "gallery/ring.jpg",
      mime: "image/jpeg",
      size: 123,
      originalName: "ring.jpg",
    });
    assert.ok(asset);
    assert.equal(asset.publicUrl, "https://cdn.example/gallery/ring.jpg");
    assert.equal(asset.filename, "ring.jpg");
    assert.equal(asset.mimeType, "image/jpeg");
    assert.equal(asset.kind, "image");
    assert.equal(asset.size, 123);
  });
});

describe("extractPresign", () => {
  it("keeps uploadUrl, headers, key, and publicUrl from a Nest presign response", () => {
    const presign = extractPresign({
      data: {
        uploadUrl: "https://upload.example/gallery/ring.jpg?token=abc",
        headers: { "Content-Type": "image/jpeg" },
        key: "gallery/ring.jpg",
        publicUrl: "https://cdn.example/gallery/ring.jpg",
        provider: "s3",
      },
    });
    assert.deepEqual(presign, {
      uploadUrl: "https://upload.example/gallery/ring.jpg?token=abc",
      headers: { "Content-Type": "image/jpeg" },
      key: "gallery/ring.jpg",
      publicUrl: "https://cdn.example/gallery/ring.jpg",
      provider: "s3",
    });
  });
});
