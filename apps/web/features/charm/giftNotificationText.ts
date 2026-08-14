export function normalizeGiftNotificationQuantity(
  quantity: number | null | undefined,
) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  return Math.max(1, Math.min(99, Math.floor(quantity ?? 1)));
}

export function formatGiftNotificationQuantity(
  quantity: number | null | undefined,
) {
  return `×${normalizeGiftNotificationQuantity(quantity)}`;
}

export function formatGiftNotificationText({
  giftEmoji,
  giftLabel,
  quantity,
}: {
  giftEmoji: string;
  giftLabel: string;
  quantity: number | null | undefined;
}) {
  return `${giftEmoji} ${giftLabel} ${formatGiftNotificationQuantity(quantity)}`;
}
