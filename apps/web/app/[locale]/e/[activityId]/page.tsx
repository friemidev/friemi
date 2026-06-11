import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Share2,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { GuestRegistrationForm } from "@/features/wechat-bridge/components/GuestRegistrationForm";
import { getPublicRegistrationActivity } from "@/features/wechat-bridge/queries/getPublicRegistrationActivity";
import { getCategoryLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

type PublicRegistrationPageProps = {
  params: Promise<{
    activityId: string;
    locale: string;
  }>;
  searchParams?: Promise<{
    inv?: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDateRange({
  endAt,
  locale,
  startAt,
}: {
  endAt: string | null;
  locale: string;
  startAt: string;
}) {
  const dateLocale =
    locale === "zh-CN" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US";
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
  });

  if (!end) {
    return dateFormatter.format(start);
  }

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
}

function getSeatLabel(attendeeCount: number, capacity: number) {
  if (capacity <= 0) {
    return `${attendeeCount} 人已报名`;
  }

  return `${attendeeCount}/${capacity} 人已报名`;
}

function getRemainingSeatLabel(remainingSeats: number | null) {
  if (remainingSeats === null) {
    return "名额不限";
  }

  return remainingSeats > 0 ? `还剩 ${remainingSeats} 个名额` : "名额已满";
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

export async function generateMetadata({
  params,
}: PublicRegistrationPageProps): Promise<Metadata> {
  const { activityId, locale } = await params;
  const activity = await getPublicRegistrationActivity(activityId);

  if (!activity) {
    return {};
  }

  const title = `${activity.title} | Next Fun`;
  const description = `${formatDateRange({
    endAt: activity.endAt,
    locale,
    startAt: activity.startAt,
  })} · ${activity.address} · ${getSeatLabel(
    activity.attendeeCount,
    activity.capacity,
  )}`;

  return {
    description,
    openGraph: {
      description,
      images: activity.coverImageUrl ? [activity.coverImageUrl] : undefined,
      title,
      type: "website",
    },
    title,
  };
}

export default async function PublicRegistrationPage({
  params,
  searchParams,
}: PublicRegistrationPageProps) {
  const { activityId, locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const activity = await getPublicRegistrationActivity(activityId);

  if (!activity) {
    notFound();
  }

  const dateLabel = formatDateRange({
    endAt: activity.endAt,
    locale,
    startAt: activity.startAt,
  });
  const seatLabel = getSeatLabel(activity.attendeeCount, activity.capacity);
  const remainingSeatLabel = getRemainingSeatLabel(activity.remainingSeats);
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const sharePath = withLocale(locale, `/e/${activity.id}`);
  const shareUrl = host ? `${protocol}://${host}${sharePath}` : sharePath;
  const qrCodePath = `/api/activities/${activity.id}/guest-registration-qr?locale=${encodeURIComponent(
    locale,
  )}`;
  const shareText = [
    activity.title,
    `时间：${dateLabel}`,
    `地点：${activity.address}`,
    `人数：${seatLabel}`,
    `报名：${shareUrl}`,
  ].join("\n");

  return (
    <PageContainer className="space-y-4 py-4 sm:space-y-6 sm:py-8">
      <section className="relative min-h-[24rem] overflow-hidden rounded-[1.5rem] bg-[#d9e9ee] p-4 shadow-[0_18px_42px_rgba(58,49,34,0.14)] sm:p-6">
        <ActivityCoverImage
          src={activity.coverImageUrl}
          overlayClassName="bg-gradient-to-t from-black/76 via-black/24 to-black/10"
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/78 via-black/38 to-transparent" />
        <div className="relative z-10 flex min-h-[21rem] flex-col justify-end gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
              {getCategoryLabel(activity.category, locale)}
            </span>
            <span className="rounded-full bg-[#eaf6ef] px-3 py-1 text-xs font-semibold text-moss shadow-sm">
              微信 H5 报名
            </span>
          </div>
          <div className="max-w-3xl rounded-[1.35rem] bg-black/32 p-4 ring-1 ring-white/10 backdrop-blur-sm">
            <h1 className="text-3xl font-semibold leading-tight text-white [text-shadow:0_3px_20px_rgba(0,0,0,0.45)] sm:text-5xl">
              {activity.title}
            </h1>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/86 sm:text-base">
              {activity.description}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/86 p-4 shadow-sm ring-1 ring-[#ead7b8]">
          <CalendarDays className="h-5 w-5 text-[#9a7448]" />
          <p className="mt-2 text-sm font-semibold text-ink">{dateLabel}</p>
        </div>
        <div className="rounded-2xl bg-white/86 p-4 shadow-sm ring-1 ring-[#ead7b8]">
          <MapPin className="h-5 w-5 text-[#9a7448]" />
          <p className="mt-2 text-sm font-semibold text-ink">
            {activity.address}
          </p>
        </div>
        <div className="rounded-2xl bg-white/86 p-4 shadow-sm ring-1 ring-[#ead7b8]">
          <UsersRound className="h-5 w-5 text-[#9a7448]" />
          <p className="mt-2 text-sm font-semibold text-ink">{seatLabel}</p>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {remainingSeatLabel}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-4 rounded-[1.5rem] bg-white/82 p-4 shadow-sm ring-1 ring-[#ead7b8] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-ink">已报名</h2>
              <p className="mt-1 text-sm text-zinc-500">{seatLabel}</p>
            </div>
            {activity.participantPreview.length > 0 ? (
              <div className="flex -space-x-2">
                {activity.participantPreview.map((participant) => (
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#d88d72] text-sm font-bold text-white ring-2 ring-white"
                    key={`${participant.kind}:${participant.id}`}
                    title={participant.displayName}
                  >
                    {participant.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={participant.avatarUrl}
                      />
                    ) : (
                      getInitial(participant.displayName)
                    )}
                  </span>
                ))}
                {activity.participantPreviewRemaining > 0 ? (
                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#23372e] px-2 text-xs font-bold text-white ring-2 ring-white">
                    +{activity.participantPreviewRemaining}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="rounded-full bg-[#fff8ec] px-3 py-1 text-xs font-semibold text-[#7e5f3a] ring-1 ring-[#ead7b8]">
                还没有人报名
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#fff8ec] p-4">
              <UserRound className="h-5 w-5 text-[#9a7448]" />
              <p className="mt-2 text-sm font-semibold text-ink">
                发起人：{activity.organizer.nickname}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fff8ec] p-4">
              <Ticket className="h-5 w-5 text-[#9a7448]" />
              <p className="mt-2 text-sm font-semibold text-ink">
                费用：{activity.priceText}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-[#d8ccb4] bg-[#fffaf2] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">分享给朋友</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  先复制群文案。微信卡片展示效果后续单独验证。
                </p>
              </div>
              <Share2 className="h-5 w-5 shrink-0 text-[#9a7448]" />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-zinc-600 ring-1 ring-[#ead7b8]">
                <span className="min-w-0 flex-1 truncate">{shareText}</span>
                <ActivityCopyButton
                  failedLabel="复制失败"
                  label="复制群文案"
                  successLabel="已复制"
                  value={shareText}
                />
              </div>
              <a
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#eaf6ef] px-4 text-sm font-semibold text-moss ring-1 ring-[#bdd9c5] transition hover:bg-[#dceede]"
                href={qrCodePath}
                rel="noreferrer"
                target="_blank"
              >
                打开二维码
              </a>
            </div>
          </div>
        </section>

        <aside className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,237,222,0.94))] p-4 shadow-sm ring-1 ring-[#d8ccb4] sm:p-5">
          <h2 className="text-xl font-semibold text-ink">免登录报名</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            微信里打开也可以直接报名。提交后会生成你的报名凭证。
          </p>
          <div className="mt-4">
            <GuestRegistrationForm
              activityId={activity.id}
              isClosed={activity.isClosed}
              isFull={activity.isFull}
              locale={locale}
              remainingSeats={activity.remainingSeats}
              shareToken={resolvedSearchParams.inv}
            />
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
