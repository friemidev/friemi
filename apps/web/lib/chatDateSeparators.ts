function toValidDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getStartOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const chatTimeSeparatorIntervalMs = 5 * 60 * 1000;

export function getChatDateKey(value: string) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatChatDateSeparator(value: string, locale: string) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  const today = getStartOfLocalDay(new Date());
  const messageDay = getStartOfLocalDay(date);
  const dayOffset = Math.round(
    (today.getTime() - messageDay.getTime()) / 86_400_000,
  );

  if (dayOffset === 0) {
    if (locale === "zh-CN") {
      return "今天";
    }

    return locale === "fr" ? "Aujourd'hui" : "Today";
  }

  if (dayOffset === 1) {
    if (locale === "zh-CN") {
      return "昨天";
    }

    return locale === "fr" ? "Hier" : "Yesterday";
  }

  if (locale === "zh-CN") {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year:
        date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function formatChatMessageTime(value: string, locale: string) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function shouldShowChatTimeSeparator(
  createdAt: string,
  previousCreatedAt?: string,
) {
  if (!previousCreatedAt) {
    return true;
  }

  if (getChatDateKey(createdAt) !== getChatDateKey(previousCreatedAt)) {
    return true;
  }

  const messageTime = new Date(createdAt).getTime();
  const previousMessageTime = new Date(previousCreatedAt).getTime();

  if (!Number.isFinite(messageTime) || !Number.isFinite(previousMessageTime)) {
    return false;
  }

  return messageTime - previousMessageTime >= chatTimeSeparatorIntervalMs;
}

export function formatChatListTimestamp(value: string, locale: string) {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  if (getChatDateKey(value) === getChatDateKey(new Date().toISOString())) {
    return formatChatMessageTime(value, locale);
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
