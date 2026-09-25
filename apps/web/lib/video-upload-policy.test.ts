import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanetVideoMimeType,
  getPlanetVideoUploadValidationError,
  maxPlanetVideoUploadFileSize,
} from "./video-upload-policy";

test("planet video policy accepts supported browser video formats", () => {
  assert.equal(getPlanetVideoMimeType("video/mp4", "clip.mp4"), "video/mp4");
  assert.equal(getPlanetVideoMimeType("", "clip.webm"), "video/webm");
  assert.equal(getPlanetVideoMimeType("video/quicktime", "clip.mov"), "video/quicktime");
});

test("planet video policy rejects unsupported and oversized files", () => {
  assert.equal(
    getPlanetVideoUploadValidationError({
      name: "clip.avi",
      size: 1,
      type: "video/x-msvideo",
    }),
    "UNSUPPORTED_FILE_TYPE",
  );
  assert.equal(
    getPlanetVideoUploadValidationError({
      name: "clip.mp4",
      size: maxPlanetVideoUploadFileSize + 1,
      type: "video/mp4",
    }),
    "FILE_TOO_LARGE",
  );
});
