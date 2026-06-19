import { Fragment } from "react";
import { ExternalLink } from "lucide-react";
import { AnalyticsExternalLink } from "@/features/analytics/components/AnalyticsExternalLink";
import type {
  AnalyticsEntityType,
  AnalyticsSourceSurface,
} from "@/features/analytics/events";
import { ActivityCopyButton } from "./ActivityCopyButton";

type ActivityRichDescriptionProps = {
  className?: string;
  copyFailedLabel: string;
  copyLabel: string;
  copySuccessLabel: string;
  entityId: string;
  entityType: AnalyticsEntityType;
  locale: string;
  sourceSurface: AnalyticsSourceSurface;
  text: string;
};

type DescriptionPart =
  | {
      kind: "text";
      value: string;
    }
  | {
      kind: "link";
      trailingText: string;
      value: string;
    };

const urlPattern = /https?:\/\/[^\s<>"']+/g;
const trailingUrlPunctuationPattern = /[.,;:!?，。；：！？、)\]}）】]+$/;
const officialLinkLabelPattern =
  /(官方链接|Official link|Official page|Lien officiel|Page officielle)\s*[：:]?\s*/gi;

function getOfficialLinkLabel(locale: string) {
  if (locale === "fr") {
    return "Lien officiel";
  }

  if (locale === "en") {
    return "Official link";
  }

  return "官方链接";
}

export function localizeDescriptionText(value: string, locale: string) {
  const officialLinkLabel = getOfficialLinkLabel(locale);

  return value.replace(officialLinkLabelPattern, `${officialLinkLabel}: `);
}

function splitDescriptionText(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push({
        kind: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    const trailingText = rawUrl.match(trailingUrlPunctuationPattern)?.[0] ?? "";
    const value = trailingText ? rawUrl.slice(0, -trailingText.length) : rawUrl;

    parts.push({
      kind: "link",
      trailingText,
      value,
    });

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      kind: "text",
      value: text.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ kind: "text", value: text }];
}

export function ActivityRichDescription({
  className,
  copyFailedLabel,
  copyLabel,
  copySuccessLabel,
  entityId,
  entityType,
  locale,
  sourceSurface,
  text,
}: ActivityRichDescriptionProps) {
  const parts = splitDescriptionText(localizeDescriptionText(text, locale));

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.kind === "text") {
          return <Fragment key={`${index}-text`}>{part.value}</Fragment>;
        }

        return (
          <Fragment key={`${index}-${part.value}`}>
            <span className="inline-flex max-w-full items-center gap-1 align-baseline">
              <AnalyticsExternalLink
                className="inline-flex min-w-0 max-w-full items-center gap-1 break-all rounded-md px-1 font-medium text-[#8a4d35] underline decoration-[#d8a083] underline-offset-4 transition hover:bg-[#fff4e8] hover:text-[#6f3b28]"
                event={{
                  name: "public_event_source_clicked",
                  entityId,
                  entityType,
                  sourceSurface,
                  properties: {
                    source_kind: "description_link",
                  },
                }}
                href={part.value}
              >
                <span className="min-w-0 break-all">{part.value}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </AnalyticsExternalLink>
              <ActivityCopyButton
                analyticsEvent={{
                  name: "field_copied",
                  entityId,
                  entityType,
                  sourceSurface,
                  properties: {
                    field_name: "description_link",
                  },
                }}
                className="h-6 w-6 rounded-full bg-white/70 hover:bg-white"
                failedLabel={copyFailedLabel}
                label={copyLabel}
                successLabel={copySuccessLabel}
                value={part.value}
              />
            </span>
            {part.trailingText}
          </Fragment>
        );
      })}
    </p>
  );
}
