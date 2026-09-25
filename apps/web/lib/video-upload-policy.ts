export const maxPlanetVideoUploadFileSize = 50 * 1024 * 1024;

export const allowedPlanetVideoMimeTypes = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;

export type AllowedPlanetVideoMimeType =
  keyof typeof allowedPlanetVideoMimeTypes;

const extensionMimeTypes = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
} as const satisfies Record<string, AllowedPlanetVideoMimeType>;

export const acceptedPlanetVideoInputTypes = [
  ...Object.keys(allowedPlanetVideoMimeTypes),
  ".mp4",
  ".webm",
  ".mov",
].join(",");

export function getPlanetVideoMimeType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
): AllowedPlanetVideoMimeType | null {
  const normalized = mimeType?.trim().toLowerCase();
  if (normalized && normalized in allowedPlanetVideoMimeTypes) {
    return normalized as AllowedPlanetVideoMimeType;
  }

  const extension = fileName?.trim().toLowerCase().split(".").pop();
  if (!extension) return null;
  return (
    extensionMimeTypes[extension as keyof typeof extensionMimeTypes] ?? null
  );
}

export function getPlanetVideoUploadValidationError(file: {
  name?: string | null;
  size: number;
  type?: string | null;
}) {
  if (!getPlanetVideoMimeType(file.type, file.name)) {
    return "UNSUPPORTED_FILE_TYPE" as const;
  }
  if (file.size > maxPlanetVideoUploadFileSize) {
    return "FILE_TOO_LARGE" as const;
  }
  return null;
}
