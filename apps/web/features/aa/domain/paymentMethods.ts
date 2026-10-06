const MULTIPLE_METHODS_PREFIX = "AA1:";
export const MAX_PAYMENT_METHOD_STORAGE_LENGTH = 160;

export function decodePaymentMethods(stored: string | null | undefined): string[] {
  if (!stored) return [];
  if (!stored.startsWith(MULTIPLE_METHODS_PREFIX)) return [stored];
  try {
    const parsed: unknown = JSON.parse(stored.slice(MULTIPLE_METHODS_PREFIX.length));
    if (Array.isArray(parsed) && parsed.length > 1 && parsed.every(item => typeof item === "string" && item.length > 0)) {
      return parsed;
    }
  } catch { /* Keep any unexpected legacy text visible instead of losing it. */ }
  return [stored];
}

export function encodePaymentMethods(values: string[]): string | null {
  if (values.length > 8 || values.some(value => typeof value !== "string")) throw new Error("INVALID");
  const methods = values.map(value => value.trim());
  if (methods.some(value => !value || /[\u0000-\u001f\u007f]/.test(value))) throw new Error("INVALID");
  const stored = methods.length === 0 ? null : methods.length === 1 ? methods[0] : `${MULTIPLE_METHODS_PREFIX}${JSON.stringify(methods)}`;
  if (stored && stored.length > MAX_PAYMENT_METHOD_STORAGE_LENGTH) throw new Error("INVALID");
  return stored;
}
