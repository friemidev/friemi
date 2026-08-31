import { isHotlinkProtectedCoverUrl } from "./activity-cover-shared";

const defaultThumbnailQuality = 75;

export function getActivityCoverDisplayUrl(imageUrl: string) {
  if (!imageUrl) {
    return "";
  }

  if (!isHotlinkProtectedCoverUrl(imageUrl)) {
    return imageUrl;
  }

  return `/api/activity-cover-proxy?url=${encodeURIComponent(imageUrl)}`;
}

export function getActivityCoverThumbnailUrl(
  imageUrl: string | null | undefined,
  size = 192,
) {
  const normalizedUrl = imageUrl?.trim() ?? "";

  if (!normalizedUrl || normalizedUrl.startsWith("/")) {
    return normalizedUrl;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return normalizedUrl;
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !parsedUrl.hostname.endsWith(".supabase.co")
  ) {
    return getActivityCoverDisplayUrl(normalizedUrl);
  }

  const objectPrefix = "/storage/v1/object/public/";
  const renderPrefix = "/storage/v1/render/image/public/";

  if (parsedUrl.pathname.startsWith(objectPrefix)) {
    parsedUrl.pathname = `${renderPrefix}${parsedUrl.pathname.slice(
      objectPrefix.length,
    )}`;
  } else if (!parsedUrl.pathname.startsWith(renderPrefix)) {
    return normalizedUrl;
  }

  const normalizedSize = Math.min(640, Math.max(64, Math.round(size)));
  parsedUrl.searchParams.set("width", String(normalizedSize));
  parsedUrl.searchParams.set("height", String(normalizedSize));
  parsedUrl.searchParams.set("resize", "cover");
  parsedUrl.searchParams.set("quality", String(defaultThumbnailQuality));

  return parsedUrl.toString();
}
