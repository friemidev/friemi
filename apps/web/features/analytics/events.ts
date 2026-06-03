import { z } from "zod";

export const analyticsEventNames = [
  "activity_list_viewed",
  "activity_card_clicked",
  "public_event_detail_viewed",
  "activity_detail_viewed",
  "team_create_started",
  "team_created",
  "join_started",
  "join_submitted",
  "comment_created",
  "comment_reply_created",
  "organizer_contact_clicked",
  "conversation_opened",
  "message_sent",
  "friend_request_sent",
  "friend_request_accepted",
  "notification_opened",
  "search_submitted",
  "filter_applied",
  "form_submit_failed",
  "wechat_webview_login_guide_viewed",
  "link_copied",
  "field_copied",
  "poster_downloaded",
  "qr_code_shared",
  "report_submitted",
  "admin_report_status_updated",
  "public_event_source_clicked",
  "public_event_converted_to_team",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export const analyticsEntityTypes = [
  "activity",
  "public_event",
  "team",
  "comment",
  "user",
  "merchant",
  "report",
  "notification",
  "conversation",
] as const;

export const analyticsSourceSurfaces = [
  "home_recent",
  "activity_list",
  "public_event_detail",
  "activity_detail",
  "global_search",
  "friend_activity",
  "notification",
  "share_link",
  "profile",
  "messages",
  "comments",
  "report_dialog",
  "admin_reports",
  "public_event_source",
  "wechat_webview",
] as const;

export type AnalyticsEnvironment = "development" | "preview" | "production";
export type AnalyticsDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsPropertyValue = AnalyticsPrimitive | AnalyticsPrimitive[];

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

const analyticsEventNameSchema = z.enum(analyticsEventNames);
const analyticsEntityTypeSchema = z.enum(analyticsEntityTypes);
const analyticsSourceSurfaceSchema = z.enum(analyticsSourceSurfaces);

const sensitivePropertyKeys = new Set([
  "address",
  "body",
  "comment_content",
  "content",
  "description",
  "email",
  "google_user",
  "join_message",
  "keyword",
  "message",
  "message_body",
  "message_text",
  "phone",
  "phone_number",
  "q",
  "query",
  "report_description",
  "search_query",
]);

const sensitivePropertySuffixes = [
  "_address",
  "_body",
  "_content",
  "_description",
  "_email",
  "_message",
  "_phone",
  "_phone_number",
  "_q",
  "_query",
];

const requiredByEvent: Partial<
  Record<
    AnalyticsEventName,
    {
      topLevel?: Array<"entityType" | "entityId" | "sourceSurface">;
      properties?: string[];
    }
  >
> = {
  activity_card_clicked: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  public_event_detail_viewed: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  activity_detail_viewed: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  team_create_started: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  team_created: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  join_started: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  join_submitted: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  comment_created: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  comment_reply_created: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  organizer_contact_clicked: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  link_copied: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  field_copied: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
    properties: ["field_name"],
  },
  poster_downloaded: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  qr_code_shared: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  report_submitted: {
    properties: ["target_type", "reason"],
  },
  admin_report_status_updated: {
    properties: ["report_id", "from_status", "to_status"],
  },
  public_event_source_clicked: {
    topLevel: ["entityType", "entityId", "sourceSurface"],
  },
  public_event_converted_to_team: {
    properties: ["public_event_id", "activity_id"],
  },
  search_submitted: {
    properties: ["keyword_length", "scope", "result_count"],
  },
  filter_applied: {
    properties: ["filter_count"],
  },
  form_submit_failed: {
    properties: ["form_name", "reason_code"],
  },
};

export const analyticsEventInputSchema = z.object({
  name: analyticsEventNameSchema,
  anonymousId: z.string().trim().max(128).optional().nullable(),
  sessionId: z.string().trim().max(128).optional().nullable(),
  locale: z.enum(["zh-CN", "en", "fr"]).default("zh-CN"),
  route: z.string().trim().min(1).max(300),
  referrer: z.string().trim().max(500).optional().nullable(),
  userAgent: z.string().trim().max(500).optional().nullable(),
  deviceType: z.enum(["desktop", "mobile", "tablet", "unknown"]).optional(),
  sourceSurface: analyticsSourceSurfaceSchema.optional().nullable(),
  entityType: analyticsEntityTypeSchema.optional().nullable(),
  entityId: z.string().trim().max(128).optional().nullable(),
  appVersion: z.string().trim().max(80).optional().nullable(),
  properties: z.record(z.unknown()).optional(),
});

export type AnalyticsEventInput = z.input<typeof analyticsEventInputSchema>;
export type ParsedAnalyticsEventInput = z.output<
  typeof analyticsEventInputSchema
>;

export type NormalizedAnalyticsEvent = Omit<
  ParsedAnalyticsEventInput,
  "properties"
> & {
  environment: AnalyticsEnvironment;
  userProfileId?: string | null;
  properties?: AnalyticsProperties;
};

function isSensitivePropertyKey(key: string) {
  const normalized = key.trim().toLowerCase();

  if (sensitivePropertyKeys.has(normalized)) {
    return true;
  }

  return sensitivePropertySuffixes.some((suffix) =>
    normalized.endsWith(suffix),
  );
}

function isAnalyticsPropertyKey(key: string) {
  return /^[a-z][a-z0-9_]{0,63}$/.test(key);
}

function normalizePrimitivePropertyValue(
  value: unknown,
): AnalyticsPrimitive | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim().slice(0, 120);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return undefined;
}

function normalizePropertyValue(
  value: unknown,
): AnalyticsPropertyValue | undefined {
  const primitiveValue = normalizePrimitivePropertyValue(value);

  if (primitiveValue !== undefined) {
    return primitiveValue;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 10)
      .map((item) => normalizePrimitivePropertyValue(item))
      .filter(
        (item): item is AnalyticsPrimitive =>
          item === null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean",
      );
  }

  return undefined;
}

export function normalizeAnalyticsProperties(
  properties: Record<string, unknown> | undefined,
) {
  if (!properties) {
    return undefined;
  }

  const entries = Object.entries(properties).slice(0, 20);
  const normalized: AnalyticsProperties = {};

  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim();

    if (!key || !isAnalyticsPropertyKey(key) || isSensitivePropertyKey(key)) {
      continue;
    }

    const value = normalizePropertyValue(rawValue);

    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function sanitizeAnalyticsRoute(route: string) {
  const trimmed = route.trim();

  if (!trimmed) {
    return "/";
  }

  try {
    const url = new URL(trimmed, "https://nextfun.local");

    return url.pathname || "/";
  } catch {
    return trimmed.split("?")[0]?.slice(0, 300) || "/";
  }
}

export function sanitizeAnalyticsReferrer(referrer: string | null | undefined) {
  const trimmed = referrer?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return trimmed.split("?")[0]?.slice(0, 500) || null;
  }
}

export function getAnalyticsEnvironment(): AnalyticsEnvironment {
  if (process.env.VERCEL_ENV === "production") {
    return "production";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return "preview";
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function inferAnalyticsDeviceType(
  userAgent: string | null | undefined,
): AnalyticsDeviceType {
  const normalized = userAgent?.toLowerCase() ?? "";

  if (!normalized) {
    return "unknown";
  }

  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return "tablet";
  }

  if (
    normalized.includes("mobile") ||
    normalized.includes("iphone") ||
    normalized.includes("android")
  ) {
    return "mobile";
  }

  return "desktop";
}

export function assertAnalyticsEventRequirements(
  event: Pick<
    NormalizedAnalyticsEvent,
    "name" | "entityType" | "entityId" | "sourceSurface" | "properties"
  >,
) {
  const requirements = requiredByEvent[event.name];

  if (!requirements) {
    return;
  }

  for (const key of requirements.topLevel ?? []) {
    if (!event[key]) {
      throw new Error(`Missing analytics field: ${key}`);
    }
  }

  for (const key of requirements.properties ?? []) {
    if (!(key in (event.properties ?? {}))) {
      throw new Error(`Missing analytics property: ${key}`);
    }
  }
}
