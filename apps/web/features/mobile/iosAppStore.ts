export const IOS_APP_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_APP_STORE_URL?.trim() ||
  "https://apps.apple.com/app/friemi/id6788944230";

const iosDeviceUserAgentPattern = /\b(iPhone|iPad|iPod)\b/i;
const ipadDesktopUserAgentPattern = /Macintosh.+Mobile\//i;
const friemiIOSAppUserAgentPattern = /\bFriemiIOS\//i;

export function isIOSWebUserAgent(userAgent: string | null | undefined) {
  const normalizedUserAgent = userAgent?.trim();

  if (
    !normalizedUserAgent ||
    friemiIOSAppUserAgentPattern.test(normalizedUserAgent)
  ) {
    return false;
  }

  return (
    iosDeviceUserAgentPattern.test(normalizedUserAgent) ||
    ipadDesktopUserAgentPattern.test(normalizedUserAgent)
  );
}
