export function normalizeGuestEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized || null;
}

export function normalizeGuestPhone(value: string | null | undefined) {
  const trimmed = value?.trim();
  const digits = trimmed?.replace(/\D/g, "") ?? "";

  if (digits.length < 6) {
    return null;
  }

  return trimmed?.startsWith("+") ? `+${digits}` : digits;
}

export function normalizeGuestWechatId(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, "");

  return normalized && normalized.length >= 3 ? normalized : null;
}
