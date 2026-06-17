function getDefaultTicketCtaLabel(locale: string) {
  if (locale === "fr") {
    return "Réserver";
  }

  if (locale === "en") {
    return "Get tickets";
  }

  return "立即抢票";
}

function getDefaultDetailsCtaLabel(locale: string) {
  if (locale === "fr") {
    return "En savoir plus";
  }

  if (locale === "en") {
    return "Learn more";
  }

  return "了解详情";
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

const genericReservationLabels = new Set([
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

const genericDetailsLabels = new Set([
  "en savoir plus",
  "plus dinfos",
  "plus dinfo",
  "voir plus",
  "learn more",
  "more info",
  "more information",
  "details",
  "detail",
  "了解详情",
  "查看更多",
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

function getGenericTicketLabelKind(label: string) {
  const key = normalizeLabelKey(label);

  if (genericReservationLabels.has(key)) {
    return "reservation";
  }

  if (genericDetailsLabels.has(key)) {
    return "details";
  }

  return null;
}

export function getTicketCtaLabel(locale: string, label?: string | null) {
  const normalizedLabel = label?.trim();

  if (normalizedLabel && isUsableTicketLabel(normalizedLabel)) {
    const genericKind = getGenericTicketLabelKind(normalizedLabel);

    if (genericKind === "details") {
      return getDefaultDetailsCtaLabel(locale);
    }

    if (!genericKind) {
      return normalizedLabel;
    }
  }

  return getDefaultTicketCtaLabel(locale);
}
