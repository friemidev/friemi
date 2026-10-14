import {
  getGenericTicketLabelKind,
  getTicketCtaLabel,
  isUsableTicketLabel,
} from "@/features/public-events/utils/ticketCta";
import { normalizeHostExternalUrl } from "@/features/mobile/hostExternalBrowserProtocol";

export const activityHostLinkKinds = [
  "SUPPLEMENTARY_FORM",
  "VIEW_DETAILS",
  "RESERVE_SPOT",
  "HOST_LINK",
] as const;
export type ActivityHostLinkKind = (typeof activityHostLinkKinds)[number];

export function getActivityHostLinkCopy(locale: string) {
  if (locale === "fr")
    return {
      title: "Lien de l’hôte",
      none: "Sans lien",
      SUPPLEMENTARY_FORM: "Formulaire",
      VIEW_DETAILS: "Infos pratiques",
      RESERVE_SPOT: "Réserver / Billets",
      HOST_LINK: "Lien de l’hôte",
      otherPurpose: "Autre contenu",
      source: "Fourni par l’hôte",
      failed: "Ouverture impossible. Réessayez.",
      urlPlaceholder: "https://exemple.com/formulaire",
    };
  if (locale === "en")
    return {
      title: "Host link",
      none: "No link",
      SUPPLEMENTARY_FORM: "Additional form",
      VIEW_DETAILS: "Activity details",
      RESERVE_SPOT: "Book / Tickets",
      HOST_LINK: "Host link",
      otherPurpose: "Other content",
      source: "Provided by the host",
      failed: "Could not open the link. Please try again.",
      urlPlaceholder: "https://example.com/form",
    };
  return {
    title: "主理人链接",
    none: "不添加链接",
    SUPPLEMENTARY_FORM: "补充登记",
    VIEW_DETAILS: "活动资料",
    RESERVE_SPOT: "预约/购票",
    HOST_LINK: "主理人链接",
    otherPurpose: "其他内容",
    source: "主理人提供",
    failed: "暂时无法打开，请重试。",
    urlPlaceholder: "https://example.com/form",
  };
}

export function getActivityHostLinkKind(
  label: string | null | undefined,
): ActivityHostLinkKind {
  const value = label?.trim();
  if (activityHostLinkKinds.includes(value as ActivityHostLinkKind))
    return value as ActivityHostLinkKind;
  const generic = value ? getGenericTicketLabelKind(value) : "reservation";
  if (generic === "details") return "VIEW_DETAILS";
  if (generic === "reservation") return "RESERVE_SPOT";
  return "HOST_LINK";
}

export function getInitialActivityHostLinkKind(values?: {
  ticketUrl?: string | null;
  ticketLabel?: string | null;
}) {
  if (!values?.ticketUrl) return "";
  const label = values.ticketLabel?.trim();
  if (
    label &&
    isUsableTicketLabel(label) &&
    !activityHostLinkKinds.includes(label as ActivityHostLinkKind) &&
    !getGenericTicketLabelKind(label)
  )
    return label;
  return getActivityHostLinkKind(label);
}

export function getActivityHostLink({
  url,
  label,
  locale,
  isCancelled = false,
  isEnded = false,
}: {
  url: string | null | undefined;
  label: string | null | undefined;
  locale: string;
  isCancelled?: boolean;
  isEnded?: boolean;
}) {
  const href = normalizeHostExternalUrl(url);
  if (!href) return null;
  const kind = getActivityHostLinkKind(label);
  if (kind === "RESERVE_SPOT" && (isCancelled || isEnded)) return null;
  const customLabel = label?.trim();
  const isCustom =
    customLabel &&
    isUsableTicketLabel(customLabel) &&
    !activityHostLinkKinds.includes(customLabel as ActivityHostLinkKind) &&
    !getGenericTicketLabelKind(customLabel);
  return {
    href,
    kind,
    label: isCustom
      ? getTicketCtaLabel(locale, customLabel)
      : getActivityHostLinkCopy(locale)[kind],
    hostname: new URL(href).hostname.replace(/^www\./i, ""),
  };
}
