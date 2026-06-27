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

const defaultImageSize = {
  height: 630,
  width: 1200,
};

const wechatImageSize = {
  height: 420,
  width: 420,
};

type TeamShareActivity = NonNullable<
  Awaited<ReturnType<typeof getActivityShareMetadataById>>
>;

const avatarColors = [
  ["#1D1D1B", "#FEFFF9"],
  ["#8E8383", "#FEFFF9"],
  ["#369758", "#FEFFF9"],
  ["#8AB68E", "#FEFFF9"],
  ["#8AB68E", "#FEFFF9"],
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
          "linear-gradient(135deg, #FFF5E6 0%, #FFF5E6 48%, #F1F2E3 100%)",
        color: "#1D1D1B",
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
          src={new URL(brand.lockupHorizontalNavyPath, baseUrl).toString()}
          style={{ height: 96, objectFit: "contain", width: 300 }}
        />
        <div style={{ color: "#8E8383", fontSize: 38, fontWeight: 700 }}>
          {copy.fallbackTitle}
        </div>
      </div>
    </div>
  );
}

function TeamWechatShareImage({
  activity,
  baseUrl,
  extraCount,
  locale,
  participants,
}: {
  activity: TeamShareActivity;
  baseUrl: string;
  extraCount: number;
  locale: string;
  participants: TeamShareActivity["participantPreview"];
}) {
  const copy = getLocaleCopy(locale);
  let participantLabel = activity.participantCount.toString();

  if (locale === "zh-CN") {
    participantLabel =
      activity.capacity > 0
        ? `${activity.participantCount}/${activity.capacity} 人`
        : `${activity.participantCount} 人`;
  } else if (activity.capacity > 0) {
    participantLabel = `${activity.participantCount}/${activity.capacity}`;
  }

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(145deg, #FFF5E6 0%, #FFF5E6 58%, #DEEBFF 100%)",
        color: "#1D1D1B",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: 34,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(54,151,88,0.24), rgba(54,151,88,0) 68%)",
          bottom: -120,
          height: 360,
          left: 30,
          position: "absolute",
          right: 30,
        }}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
          width: "100%",
        }}
      >
        <img
          alt={brand.name}
          src={new URL(brand.lockupHorizontalNavyPath, baseUrl).toString()}
          style={{ height: 36, objectFit: "contain", width: 124 }}
        />
        <div
          style={{
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(54,151,88,0.34)",
            borderRadius: 999,
            color: "#B5301F",
            fontSize: 18,
            fontWeight: 900,
            padding: "8px 13px",
          }}
        >
          {copy.openCrew}
        </div>
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "relative",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            paddingLeft: participants.length > 1 ? 20 : 0,
          }}
        >
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
                  border: "7px solid #FFF5E6",
                  borderRadius: 999,
                  boxShadow: "0 16px 34px rgba(76, 55, 31, 0.22)",
                  color,
                  display: "flex",
                  fontSize: 42,
                  fontWeight: 900,
                  height: 104,
                  justifyContent: "center",
                  marginLeft: index === 0 ? 0 : -24,
                  overflow: "hidden",
                  width: 104,
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
                background: "#1D1D1B",
                border: "7px solid #FFF5E6",
                borderRadius: 999,
                boxShadow: "0 16px 34px rgba(76, 55, 31, 0.2)",
                color: "#FEFFF9",
                display: "flex",
                fontSize: extraCount > 99 ? 27 : 34,
                fontWeight: 900,
                height: 104,
                justifyContent: "center",
                marginLeft: participants.length > 0 ? -24 : 0,
                width: 104,
              }}
            >
              +{Math.min(extraCount, 99)}
            </div>
          ) : null}
        </div>

        <div
          style={{
            alignItems: "center",
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(226, 190, 158, 0.85)",
            borderRadius: 999,
            color: "#8E8383",
            display: "flex",
            fontSize: 24,
            fontWeight: 900,
            padding: "11px 18px",
          }}
        >
          {participantLabel} {copy.joined}
        </div>
      </div>

      <div
        style={{
          color: "#1D1D1B",
          fontSize: 24,
          fontWeight: 900,
          lineHeight: 1.14,
          maxWidth: 328,
          position: "relative",
          textAlign: "center",
        }}
      >
        {truncateShareText(activity.title, 30)}
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const activityId = requestUrl.searchParams.get("activityId");
  const locale = requestUrl.searchParams.get("locale") || "zh-CN";
  const accessToken = requestUrl.searchParams.get("access");
  const variant =
    requestUrl.searchParams.get("variant") === "wechat" ? "wechat" : "default";
  const baseUrl = getRequestBaseUrl(request.headers);
  const activity = activityId
    ? await getActivityShareMetadataById(activityId, accessToken)
    : null;
  const copy = getLocaleCopy(locale);

  if (!activity) {
    return new ImageResponse(
      <FallbackShareImage baseUrl={baseUrl} locale={locale} />,
      variant === "wechat" ? wechatImageSize : defaultImageSize,
    );
  }

  const dateLabel = getShareDateLabel({
    endAt: activity.endAt,
    floating: true,
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
  const participants = activity.participantPreview.slice(
    0,
    variant === "wechat" ? 3 : 4,
  );
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

  if (variant === "wechat") {
    return new ImageResponse(
      <TeamWechatShareImage
        activity={activity}
        baseUrl={baseUrl}
        extraCount={extraCount}
        locale={locale}
        participants={participants}
      />,
      wechatImageSize,
    );
  }

  return new ImageResponse(
    <div
      style={{
        background:
          "linear-gradient(135deg, #FFF5E6 0%, #FFF5E6 46%, #F1F2E3 100%)",
        color: "#1D1D1B",
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
              src={new URL(brand.lockupHorizontalNavyPath, baseUrl).toString()}
              style={{ height: 58, objectFit: "contain", width: 188 }}
            />
            <div
              style={{
                background: "#F1F2E3",
                border: "1px solid #D6D5B2",
                borderRadius: 999,
                color: "#B5301F",
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
              color: "#8E8383",
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
              color: "#1D1D1B",
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
              color: "#8E8383",
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
                      border: "4px solid #FFF5E6",
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
                    background: "#1D1D1B",
                    border: "4px solid #FFF5E6",
                    borderRadius: 999,
                    color: "#FEFFF9",
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
                color: "#8E8383",
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
                color: "#FEFFF9",
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
    defaultImageSize,
  );
}
