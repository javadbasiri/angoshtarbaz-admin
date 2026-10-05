import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absoluteUploadUrl,
  encodeGalleryObjectKey,
  galleryUploadMode,
} from "./gallery-upload-target.ts";

const API = "http://localhost:3001";

describe("galleryUploadMode", () => {
  it("sends mock and same-origin uploads through the server action", () => {
    assert.equal(
      galleryUploadMode(
        { provider: "mock", uploadUrl: "http://localhost:3001/gallery/upload/gallery/a.jpg" },
        API,
      ),
      "server",
    );
    assert.equal(
      galleryUploadMode(
        { provider: "Mock", uploadUrl: "https://cdn.example/file.jpg" },
        API,
      ),
      "server",
    );
    assert.equal(
      galleryUploadMode(
        { uploadUrl: "http://localhost:3001/gallery/upload/gallery/a.jpg" },
        API,
      ),
      "server",
    );
    assert.equal(galleryUploadMode({ uploadUrl: "/gallery/upload/gallery/a.jpg" }, API), "server");
  });

  it("lets the browser PUT external presigned URLs", () => {
    assert.equal(
      galleryUploadMode(
        {
          provider: "s3",
          uploadUrl: "https://bucket.s3.amazonaws.com/gallery/a.jpg?X-Amz-Signature=abc",
        },
        API,
      ),
      "browser",
    );
    assert.equal(
      galleryUploadMode(
        { provider: "public", uploadUrl: "http://localhost:3001/gallery/upload/gallery/a.jpg" },
        API,
      ),
      "browser",
    );
    assert.equal(
      galleryUploadMode(
        { uploadUrl: "https://cdn.example/signed/a.jpg" },
        API,
      ),
      "browser",
    );
  });
});

describe("absoluteUploadUrl", () => {
  it("resolves relative upload URLs against the Nest origin", () => {
    assert.equal(
      absoluteUploadUrl("/gallery/upload/gallery/a.jpg", API),
      "http://localhost:3001/gallery/upload/gallery/a.jpg",
    );
    assert.equal(
      absoluteUploadUrl("https://bucket.s3.amazonaws.com/a.jpg", API),
      "https://bucket.s3.amazonaws.com/a.jpg",
    );
  });
});

describe("encodeGalleryObjectKey", () => {
  it("encodes safe keys and rejects traversal", () => {
    assert.equal(encodeGalleryObjectKey("gallery/file.jpg"), "gallery/file.jpg");
    assert.equal(encodeGalleryObjectKey("gallery/a b.jpg"), "gallery/a%20b.jpg");
    assert.equal(encodeGalleryObjectKey("../etc/passwd"), null);
    assert.equal(encodeGalleryObjectKey("/gallery/a.jpg"), null);
    assert.equal(encodeGalleryObjectKey("gallery//a.jpg"), null);
    assert.equal(encodeGalleryObjectKey(""), null);
  });
});
