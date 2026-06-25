import { ImageResponse } from "next/og";
import { getActivityShareMetadataById } from "@/features/activities/queries/getActivityById";
import { brand } from "@/lib/brand";
import {
  getRequestBaseUrl,
  getShareDateLabel,
  getShareLocationLabel,
  getSharePriceLabel,
  getTeamShareDescription,
  resolveAbsoluteUrl,
  resolveShareImageUrl,
  truncateShareText,
} from "@/lib/share-metadata";

export const dynamic = "force-dynamic";

const imageSize = {
  height: 630,
  width: 1200,
};

const avatarColors = [
  ["#111827", "#ffffff"],
  ["#8b8d92", "#ffffff"],
  ["#d88d72", "#ffffff"],
  ["#72a7cf", "#ffffff"],
  ["#7b8f66", "#ffffff"],
] as const;

function getAvatarInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "F";
}

function getAvatarColor(index: number) {
  return avatarColors[index % avatarColors.length];
}

function getLocaleCopy(locale: string) {
  if (locale === "fr") {
    return {
      brandLine: "Une sortie qui attend son crew",
      fallbackTitle: brand.name,
      joined: "participants",
      openCrew: "Crew ouvert",
    };
  }

  if (locale === "en") {
    return {
      brandLine: "A plan waiting for its crew",
      fallbackTitle: brand.name,
      joined: "joined",
      openCrew: "Open crew",
    };
  }

  return {
    brandLine: "一起出发的组局邀请",
    fallbackTitle: brand.name,
    joined: "已加入",
    openCrew: "开放组局",
  };
}

function resolveSafeImageUrl(
  value: string | null | undefined,
  baseUrl: string,
) {
  const resolved = resolveAbsoluteUrl(value, baseUrl);

  if (!resolved) {
    return null;
  }

  try {
    const url = new URL(resolved);

    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function FallbackShareImage({
  baseUrl,
  locale,
}: {
  baseUrl: string;
  locale: string;
}) {
  const copy = getLocaleCopy(locale);

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, #fffaf2 0%, #f4ecdd 48%, #e8f1f3 100%)",
        color: "#151515",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: 72,
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <img
          alt={brand.name}
          src={new URL("/friemi-logotitle.png", baseUrl).toString()}
          style={{ height: 96, objectFit: "contain", width: 300 }}
        />
        <div style={{ color: "#6f5841", fontSize: 38, fontWeight: 700 }}>
          {copy.fallbackTitle}
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const activityId = requestUrl.searchParams.get("activityId");
  const locale = requestUrl.searchParams.get("locale") || "zh-CN";
  const accessToken = requestUrl.searchParams.get("access");
  const baseUrl = getRequestBaseUrl(request.headers);
  const activity = activityId
    ? await getActivityShareMetadataById(activityId, accessToken)
    : null;
  const copy = getLocaleCopy(locale);

  if (!activity) {
    return new ImageResponse(
      <FallbackShareImage baseUrl={baseUrl} locale={locale} />,
      imageSize,
    );
  }

  const dateLabel = getShareDateLabel({
    endAt: activity.endAt,
    locale,
    startAt: activity.startAt,
  });
  const locationLabel = getShareLocationLabel({
    address: activity.address,
    city: activity.city,
  });
  const priceLabel = getSharePriceLabel(
    activity.priceType,
    activity.priceText,
    locale,
  );
  const coverImageUrl = resolveShareImageUrl(activity.coverImageUrl, baseUrl);
  const participants = activity.participantPreview.slice(0, 4);
  const extraCount = Math.max(
    0,
    activity.participantCount - participants.length,
  );
  const summary = getTeamShareDescription({
    capacity: activity.capacity,
    dateLabel,
    locale,
    locationLabel,
    participantCount: activity.participantCount,
    priceLabel,
  });

  return new ImageResponse(
    <div
      style={{
        background:
          "linear-gradient(135deg, #fff9ef 0%, #f5eddf 46%, #e8f2f5 100%)",
        color: "#151515",
        display: "flex",
        height: "100%",
        padding: 48,
        width: "100%",
      }}
    >
      <div
        style={{
          background: "rgba(255, 253, 248, 0.92)",
          border: "1px solid rgba(222, 199, 164, 0.92)",
          borderRadius: 42,
          boxShadow: "0 24px 70px rgba(85, 64, 33, 0.13)",
          display: "flex",
          gap: 38,
          height: "100%",
          padding: 34,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            minWidth: 0,
            padding: "6px 0 2px",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
            <img
              alt={brand.name}
              src={new URL("/friemi-logotitle.png", baseUrl).toString()}
              style={{ height: 58, objectFit: "contain", width: 188 }}
            />
            <div
              style={{
                background: "#fff5e8",
                border: "1px solid #ead5b3",
                borderRadius: 999,
                color: "#8d5f36",
                fontSize: 22,
                fontWeight: 800,
                padding: "11px 18px",
              }}
            >
              {copy.openCrew}
            </div>
          </div>

          <div
            style={{
              color: "#876445",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 0,
              marginTop: 44,
            }}
          >
            {copy.brandLine}
          </div>

          <div
            style={{
              color: "#141414",
              fontSize: 60,
              fontWeight: 900,
              lineHeight: 1.05,
              marginTop: 16,
              maxWidth: 650,
            }}
          >
            {truncateShareText(activity.title, 42)}
          </div>

          <div
            style={{
              color: "#5d5147",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.35,
              marginTop: 24,
              maxWidth: 690,
            }}
          >
            {summary}
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex", paddingLeft: 4 }}>
              {participants.map((participant, index) => {
                const [background, color] = getAvatarColor(index);
                const safeAvatarUrl = resolveSafeImageUrl(
                  participant.avatarUrl,
                  baseUrl,
                );

                return (
                  <div
                    key={participant.id}
                    style={{
                      alignItems: "center",
                      background,
                      border: "4px solid #fffaf2",
                      borderRadius: 999,
                      color,
                      display: "flex",
                      fontSize: 28,
                      fontWeight: 900,
                      height: 68,
                      justifyContent: "center",
                      marginLeft: index === 0 ? 0 : -16,
                      overflow: "hidden",
                      width: 68,
                    }}
                  >
                    {safeAvatarUrl ? (
                      <img
                        alt=""
                        src={safeAvatarUrl}
                        style={{
                          height: "100%",
                          objectFit: "cover",
                          width: "100%",
                        }}
                      />
                    ) : (
                      getAvatarInitial(participant.nickname)
                    )}
                  </div>
                );
              })}
              {extraCount > 0 ? (
                <div
                  style={{
                    alignItems: "center",
                    background: "#151515",
                    border: "4px solid #fffaf2",
                    borderRadius: 999,
                    color: "#ffffff",
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 900,
                    height: 68,
                    justifyContent: "center",
                    marginLeft: participants.length > 0 ? -16 : 0,
                    width: 68,
                  }}
                >
                  +{extraCount}
                </div>
              ) : null}
            </div>
            <div
              style={{
                color: "#6f5944",
                fontSize: 24,
                fontWeight: 800,
                marginLeft: 18,
              }}
            >
              {activity.participantCount} {copy.joined}
            </div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(215, 194, 161, 0.92)",
            borderRadius: 34,
            boxShadow: "0 18px 48px rgba(53, 42, 26, 0.16)",
            display: "flex",
            flexShrink: 0,
            height: 480,
            overflow: "hidden",
            position: "relative",
            width: 360,
          }}
        >
          <img
            alt=""
            src={coverImageUrl}
            style={{ height: "100%", objectFit: "cover", width: "100%" }}
          />
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 36%, rgba(0,0,0,0.64) 100%)",
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              left: 0,
              padding: 26,
              position: "absolute",
              right: 0,
              top: 0,
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.15,
                textShadow: "0 2px 12px rgba(0,0,0,0.35)",
              }}
            >
              {truncateShareText(locationLabel || activity.city, 34)}
            </div>
          </div>
        </div>
      </div>
    </div>,
    imageSize,
  );
}
