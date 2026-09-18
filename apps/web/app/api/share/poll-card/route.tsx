import { getSharedActivityPollMetadata } from "@/features/polls/server/pollService";
import { brand } from "@/lib/brand";
import { createShareImageResponse } from "@/lib/share-image-response";
import { getRequestBaseUrl, truncateShareText } from "@/lib/share-metadata";

export const dynamic = "force-dynamic";

const defaultImageSize = {
  height: 630,
  width: 1200,
};

const wechatImageSize = {
  height: 420,
  width: 420,
};

function getPollCardCopy(locale: string) {
  if (locale === "fr") {
    return {
      action: "Ouvrir et voter",
      fallbackActivity: "Sondage Friemi",
      label: "SONDAGE",
    };
  }

  if (locale === "en") {
    return {
      action: "Open and vote",
      fallbackActivity: "Friemi poll",
      label: "POLL",
    };
  }

  return {
    action: "打开链接参与投票",
    fallbackActivity: "Friemi 投票",
    label: "投票",
  };
}

function PollShareImage({
  activityTitle,
  baseUrl,
  locale,
  question,
  variant,
}: {
  activityTitle: string;
  baseUrl: string;
  locale: string;
  question: string;
  variant: "default" | "wechat";
}) {
  const copy = getPollCardCopy(locale);
  const compact = variant === "wechat";

  return (
    <div
      style={{
        background: "#FEFFF9",
        color: "#1D1D1B",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        padding: compact ? 30 : 48,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#156240",
          bottom: 0,
          display: "flex",
          left: 0,
          position: "absolute",
          top: 0,
          width: compact ? 14 : 22,
        }}
      />
      <div
        style={{
          border: "2px solid #D6D5B2",
          borderRadius: compact ? 30 : 38,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: compact ? 28 : 42,
          position: "relative",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <img
            alt={brand.name}
            src={new URL(brand.lockupHorizontalNavyPath, baseUrl).toString()}
            style={{
              height: compact ? 35 : 50,
              objectFit: "contain",
              width: compact ? 124 : 176,
            }}
          />
          <div
            style={{
              background: "#E8F6EC",
              borderRadius: 999,
              color: "#156240",
              display: "flex",
              fontSize: compact ? 17 : 25,
              fontWeight: 900,
              padding: compact ? "8px 13px" : "11px 18px",
            }}
          >
            {copy.label}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: compact ? 15 : 22,
          }}
        >
          <div
            style={{
              color: "#607268",
              display: "flex",
              fontSize: compact ? 17 : 27,
              fontWeight: 700,
            }}
          >
            {truncateShareText(activityTitle || copy.fallbackActivity, 48)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: compact ? 30 : 52,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 1.2,
            }}
          >
            {truncateShareText(
              question || copy.fallbackActivity,
              compact ? 44 : 60,
            )}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            color: "#156240",
            display: "flex",
            fontSize: compact ? 18 : 28,
            fontWeight: 800,
            gap: 10,
          }}
        >
          <div
            style={{
              background: "#369758",
              borderRadius: 999,
              display: "flex",
              height: compact ? 12 : 16,
              width: compact ? 12 : 16,
            }}
          />
          {copy.action}
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token")?.trim() ?? "";
  const locale = requestUrl.searchParams.get("locale") || "zh-CN";
  const variant =
    requestUrl.searchParams.get("variant") === "wechat" ? "wechat" : "default";
  const baseUrl = getRequestBaseUrl(request.headers);
  const poll = token ? await getSharedActivityPollMetadata(token) : null;
  const copy = getPollCardCopy(locale);

  return createShareImageResponse(
    <PollShareImage
      activityTitle={poll?.activityTitle ?? copy.fallbackActivity}
      baseUrl={baseUrl}
      locale={locale}
      question={poll?.question ?? copy.fallbackActivity}
      variant={variant}
    />,
    variant === "wechat" ? wechatImageSize : defaultImageSize,
  );
}
