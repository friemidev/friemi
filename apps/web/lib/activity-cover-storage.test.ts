import assert from "node:assert/strict";
import test from "node:test";
import {
  detectActivityCoverMimeType,
  isActivityCoverUploadPathOwnedByUser,
  validateImageUploadFile,
} from "./activity-cover-storage";

function ftypBuffer(brand: string) {
  const buffer = Buffer.alloc(32);
  buffer.writeUInt32BE(32, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write(brand, 8, "ascii");

  return buffer;
}

test("detects expanded image upload formats by file signature", () => {
  assert.equal(
    detectActivityCoverMimeType(Buffer.from("GIF89a0000", "ascii")),
    "image/gif",
  );
  assert.equal(detectActivityCoverMimeType(ftypBuffer("avif")), "image/avif");
  assert.equal(detectActivityCoverMimeType(ftypBuffer("heic")), "image/heic");
  assert.equal(detectActivityCoverMimeType(ftypBuffer("mif1")), "image/heif");
});

test("validates GIF uploads with content detection", async () => {
  const file = new File([Buffer.from("GIF89a0000", "ascii")], "loop.gif", {
    type: "image/gif",
  });
  const result = await validateImageUploadFile(file);

  assert.equal("error" in result, false);

  if (!("error" in result)) {
    assert.equal(result.detectedMimeType, "image/gif");
  }
});

test("accepts HEIC sequence MIME aliases when content is HEIC", async () => {
  const file = new File([ftypBuffer("heic")], "camera.heic", {
    type: "image/heic-sequence",
  });
  const result = await validateImageUploadFile(file);

  assert.equal("error" in result, false);

  if (!("error" in result)) {
    assert.equal(result.detectedMimeType, "image/heic");
  }
});

test("rejects unsupported image content without throwing", async () => {
  const file = new File([Buffer.from("<svg></svg>", "utf8")], "icon.svg", {
    type: "image/svg+xml",
  });

  assert.deepEqual(await validateImageUploadFile(file), {
    error: "UNSUPPORTED_FILE_TYPE",
  });
});

test("accepts only signed cover paths owned by the current user", () => {
  const path = "user-123/123e4567-e89b-12d3-a456-426614174000.jpg";

  assert.equal(isActivityCoverUploadPathOwnedByUser("user-123", path), true);
  assert.equal(isActivityCoverUploadPathOwnedByUser("user-456", path), false);
  assert.equal(
    isActivityCoverUploadPathOwnedByUser(
      "user-123",
      "user-123/../../another-user/image.jpg",
    ),
    false,
  );
});
