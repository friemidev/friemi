export type SignedImageUploadErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "MISSING_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_CONTENT"
  | "BUCKET_NOT_AVAILABLE"
  | "UPLOAD_FAILED"
  | "INVALID_UPLOAD_PATH"
  | "UNAUTHORIZED";

type SignedImageUploadResult =
  | { error: SignedImageUploadErrorCode }
  | { path: string; url: string };

async function getErrorCode(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: SignedImageUploadErrorCode;
  } | null;

  return body?.error ?? "UPLOAD_FAILED";
}

export async function uploadImageWithSignedUrl(
  endpoint: string,
  file: File,
): Promise<SignedImageUploadResult> {
  const createResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }),
  });

  if (!createResponse.ok) {
    return { error: await getErrorCode(createResponse) };
  }

  const signedUpload = (await createResponse.json()) as {
    path?: string;
    signedUrl?: string;
  };

  if (!signedUpload.path || !signedUpload.signedUrl) {
    return { error: "UPLOAD_FAILED" };
  }

  const uploadBody = new FormData();
  uploadBody.append("cacheControl", "31536000");
  uploadBody.append("", file);

  const uploadResponse = await fetch(signedUpload.signedUrl, {
    method: "PUT",
    headers: { "x-upsert": "false" },
    body: uploadBody,
    credentials: "omit",
  });

  if (!uploadResponse.ok) {
    return { error: "UPLOAD_FAILED" };
  }

  const finalizeResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "finalize",
      path: signedUpload.path,
    }),
  });

  if (!finalizeResponse.ok) {
    return { error: await getErrorCode(finalizeResponse) };
  }

  const finalized = (await finalizeResponse.json()) as {
    path?: string;
    url?: string;
  };

  if (!finalized.path || !finalized.url) {
    return { error: "UPLOAD_FAILED" };
  }

  return { path: finalized.path, url: finalized.url };
}
