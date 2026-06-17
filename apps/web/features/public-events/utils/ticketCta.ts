function getDefaultTicketCtaLabel(locale: string) {
  if (locale === "fr") {
    return "Réserver";
  }

  if (locale === "en") {
    return "Get tickets";
  }

  return "立即抢票";
}

function normalizeLabelKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
}

const genericTicketLabels = new Set([
  "reservation",
  "reserver",
  "billetterie",
  "inscription",
  "sinscrire",
  "ticket",
  "tickets",
  "booking",
  "book",
  "book now",
  "reserve",
  "get tickets",
  "buy tickets",
  "buy ticket",
  "购票",
  "订票",
  "预约",
  "报名",
  "立即抢票",
]);

export function isUsableTicketLabel(label: string | null | undefined) {
  const normalizedLabel = label?.trim();

  if (!normalizedLabel || normalizedLabel.length > 40) {
    return false;
  }

  if (/^(https?:\/\/|www\.)/i.test(normalizedLabel)) {
    return false;
  }

  return true;
}

function isGenericTicketLabel(label: string) {
  return genericTicketLabels.has(normalizeLabelKey(label));
}

export function getTicketCtaLabel(locale: string, label?: string | null) {
  const normalizedLabel = label?.trim();

  if (
    normalizedLabel &&
    isUsableTicketLabel(normalizedLabel) &&
    !isGenericTicketLabel(normalizedLabel)
  ) {
    return normalizedLabel;
  }

  return getDefaultTicketCtaLabel(locale);
}
