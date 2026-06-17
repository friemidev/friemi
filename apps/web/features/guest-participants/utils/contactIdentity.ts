export function normalizeGuestEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized || null;
}

export function normalizeGuestPhone(value: string | null | undefined) {
  const digits = value?.replace(/[^\d+]/g, "").trim();

  return digits && digits.length >= 6 ? digits : null;
}

export function normalizeGuestWechatId(value: string | null | undefined) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  return normalized && normalized.length >= 3 ? normalized : null;
}

export function hasGuestContactIdentity({
  normalizedEmail,
  normalizedPhone,
  normalizedWechatId,
}: {
  normalizedEmail?: string | null;
  normalizedPhone?: string | null;
  normalizedWechatId?: string | null;
}) {
  return Boolean(normalizedEmail || normalizedPhone || normalizedWechatId);
}
