import { isUploadedProfileAvatarUrl } from "@/lib/activity-cover-storage";
import { isDefaultProfileAvatarSrc } from "./defaultAvatars";

export function isUserManagedProfileAvatarUrl(
  avatarUrl: string | null | undefined,
) {
  if (!avatarUrl) {
    return false;
  }

  return (
    isDefaultProfileAvatarSrc(avatarUrl) ||
    isUploadedProfileAvatarUrl(avatarUrl)
  );
}

export function resolveProfileAvatarUrlForClerkSync({
  clerkAvatarUrl,
  storedAvatarUrl,
}: {
  clerkAvatarUrl: string | null;
  storedAvatarUrl: string | null | undefined;
}) {
  return isUserManagedProfileAvatarUrl(storedAvatarUrl)
    ? storedAvatarUrl!
    : clerkAvatarUrl;
}
