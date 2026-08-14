export const maxImageUploadFileSize = 10 * 1024 * 1024;
export const maxAnimatedImageUploadFileSize = 20 * 1024 * 1024;
export const maxProfileAvatarUploadFileSize = 8 * 1024 * 1024;
export const maxImageBucketFileSize = maxAnimatedImageUploadFileSize;

export const allowedImageMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/heic": "heic",
  "image/heif": "heif",
} as const;

export const imageMimeTypeAliases = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/x-ms-bmp": "image/bmp",
  "image/heic-sequence": "image/heic",
  "image/heif-sequence": "image/heif",
} as const;

export type AllowedImageMimeType = keyof typeof allowedImageMimeTypes;
export type ImageUploadClientValidationError =
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE";
export type ImageUploadSizeProfile = "standard" | "avatar";
export type ImageUploadFileLike = {
  name?: string | null;
  size: number;
  type?: string | null;
};

const fileExtensionMimeTypes = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const satisfies Record<string, AllowedImageMimeType>;

export const acceptedImageInputTypes = [
  "image/*",
  ...Object.keys(allowedImageMimeTypes),
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".heic",
  ".heif",
  ".bmp",
].join(",");

export function normalizeImageMimeType(
  mimeType: string | null | undefined,
): AllowedImageMimeType | null {
  const normalized = mimeType?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized in allowedImageMimeTypes) {
    return normalized as AllowedImageMimeType;
  }

  return (
    imageMimeTypeAliases[normalized as keyof typeof imageMimeTypeAliases] ??
    null
  );
}

export function getAllowedImageMimeTypes() {
  return [
    ...Object.keys(allowedImageMimeTypes),
    ...Object.keys(imageMimeTypeAliases),
  ];
}

export function getImageMimeTypeFromFileName(
  fileName: string | null | undefined,
): AllowedImageMimeType | null {
  const extension = fileName?.trim().toLowerCase().split(".").pop();

  if (!extension) {
    return null;
  }

  return (
    fileExtensionMimeTypes[extension as keyof typeof fileExtensionMimeTypes] ??
    null
  );
}

export function getLikelyImageMimeType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
): AllowedImageMimeType | null {
  return (
    normalizeImageMimeType(mimeType) ?? getImageMimeTypeFromFileName(fileName)
  );
}

export function areCompatibleImageMimeTypes(
  left: AllowedImageMimeType,
  right: AllowedImageMimeType,
) {
  if (left === right) {
    return true;
  }

  const isHeifFamily = (mimeType: AllowedImageMimeType) =>
    mimeType === "image/heic" || mimeType === "image/heif";

  return isHeifFamily(left) && isHeifFamily(right);
}

export function getImageUploadSizeLimit(
  mimeType: AllowedImageMimeType | null | undefined,
  profile: ImageUploadSizeProfile = "standard",
) {
  if (profile === "avatar") {
    return maxProfileAvatarUploadFileSize;
  }

  return mimeType === "image/gif"
    ? maxAnimatedImageUploadFileSize
    : maxImageUploadFileSize;
}

export function getImageUploadClientValidationError(
  file: ImageUploadFileLike,
  profile: ImageUploadSizeProfile = "standard",
): ImageUploadClientValidationError | null {
  const declaredType = file.type?.trim().toLowerCase();
  const likelyMimeType = getLikelyImageMimeType(file.type, file.name);

  if (!likelyMimeType && declaredType && !declaredType.startsWith("image/")) {
    return "UNSUPPORTED_FILE_TYPE";
  }

  if (file.size > getImageUploadSizeLimit(likelyMimeType, profile)) {
    return "FILE_TOO_LARGE";
  }

  return null;
}
