import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { absoluteUploadUrl, browserUploadTarget } from "./gallery-upload-target.ts";

const API = "http://localhost:3001";

describe("browserUploadTarget", () => {
  it("keeps the mock query token and drops Authorization", () => {
    const target = browserUploadTarget(
      {
        uploadUrl: "http://localhost:3001/gallery/upload/gallery/a.jpg?token=abc",
        headers: { "Content-Type": "image/png", Authorization: "Bearer secret", Host: "localhost" },
      },
      API,
    );
    assert.equal(target.url, "http://localhost:3001/gallery/upload/gallery/a.jpg?token=abc");
    assert.deepEqual(target.headers, { "Content-Type": "image/png" });
  });

  it("absolutizes a relative mock upload URL", () => {
    const target = browserUploadTarget(
      {
        uploadUrl: "/gallery/upload/gallery/a.jpg?token=abc",
        headers: { "Content-Type": "image/jpeg" },
      },
      API,
    );
    assert.equal(target.url, "http://localhost:3001/gallery/upload/gallery/a.jpg?token=abc");
    assert.deepEqual(target.headers, { "Content-Type": "image/jpeg" });
  });

  it("leaves an s3 signed URL on its own host", () => {
    const signed = "https://bucket.storage.liara.space/gallery/a.jpg?X-Amz-Signature=abc";
    const target = browserUploadTarget(
      { uploadUrl: signed, headers: { "Content-Type": "image/webp" } },
      API,
    );
    assert.equal(target.url, signed);
  });
});

describe("absoluteUploadUrl", () => {
  it("resolves relative upload URLs against the Nest origin", () => {
    assert.equal(
      absoluteUploadUrl("/gallery/upload/gallery/a.jpg?token=abc", API),
      "http://localhost:3001/gallery/upload/gallery/a.jpg?token=abc",
    );
    assert.equal(
      absoluteUploadUrl("https://bucket.s3.amazonaws.com/a.jpg", API),
      "https://bucket.s3.amazonaws.com/a.jpg",
    );
  });
});
