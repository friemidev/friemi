import { normalizeFriemiCode } from "./friemiCode";

export function extractFriemiCodeFromQrValue(rawValue: string, origin: string) {
  const directCode = normalizeFriemiCode(rawValue.trim());
  if (directCode) return directCode;

  try {
    const url = new URL(rawValue.trim());
    if (
      url.origin !== origin ||
      !/^\/(?:zh-CN|en|fr)\/friends\/?$/.test(url.pathname)
    ) {
      return null;
    }
    return normalizeFriemiCode(url.searchParams.get("friendCode") ?? "");
  } catch {
    return null;
  }
}
