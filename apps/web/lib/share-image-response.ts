import type { ReactElement } from "react";
import { ImageResponse } from "next/og";

const shareImageCacheControl =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function createShareImageResponse(
  element: ReactElement,
  size: { height: number; width: number },
) {
  const generatedResponse = new ImageResponse(element, size);
  const imageBytes = await generatedResponse.arrayBuffer();
  const headers = new Headers(generatedResponse.headers);

  headers.set("Cache-Control", shareImageCacheControl);
  headers.set("Content-Length", imageBytes.byteLength.toString());
  headers.set("Content-Type", "image/png");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(imageBytes, {
    headers,
    status: generatedResponse.status,
  });
}
