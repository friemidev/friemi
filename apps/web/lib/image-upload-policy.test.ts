import assert from "node:assert/strict";
import test from "node:test";
import {
  getImageUploadClientValidationError,
  getLikelyImageMimeType,
  maxImageUploadFileSize,
  maxProfileAvatarUploadFileSize,
} from "./image-upload-policy";

test("infers supported image types from MIME type and extension", () => {
  assert.equal(getLikelyImageMimeType("image/jpg", "photo"), "image/jpeg");
  assert.equal(getLikelyImageMimeType("", "loop.GIF"), "image/gif");
  assert.equal(getLikelyImageMimeType("", "camera.heic"), "image/heic");
});

test("uses the same 10 MB client size limit for every image format", () => {
  assert.equal(
    getImageUploadClientValidationError({
      name: "loop.gif",
      size: maxImageUploadFileSize + 1,
      type: "",
    }),
    "FILE_TOO_LARGE",
  );
  assert.equal(
    getImageUploadClientValidationError({
      name: "still.png",
      size: maxImageUploadFileSize + 1,
      type: "image/png",
    }),
    "FILE_TOO_LARGE",
  );
});

test("uses the same 10 MB size limit for avatar uploads", () => {
  assert.equal(
    getImageUploadClientValidationError(
      {
        name: "avatar.gif",
        size: maxProfileAvatarUploadFileSize + 1,
        type: "image/gif",
      },
      "avatar",
    ),
    "FILE_TOO_LARGE",
  );
});

test("rejects clearly non-image files before upload", () => {
  assert.equal(
    getImageUploadClientValidationError({
      name: "document.pdf",
      size: 1024,
      type: "application/pdf",
    }),
    "UNSUPPORTED_FILE_TYPE",
  );
});
