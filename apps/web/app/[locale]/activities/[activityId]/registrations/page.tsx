import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, UsersRound } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { getGuestRegistrationsForOrganizer } from "@/features/wechat-bridge/queries/getPublicRegistrationActivity";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type ActivityGuestRegistrationsPageProps = {
  params: Promise<{
    activityId: string;
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDate(value: string, locale: string) {
  const dateLocale =
    locale === "zh-CN" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US";

  return new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
  }).format(new Date(value));
}

export default async function ActivityGuestRegistrationsPage({
  params,
}: ActivityGuestRegistrationsPageProps) {
  const { activityId, locale } = await params;
  const viewerProfile = await ensureCurrentUserProfileSnapshot(locale);
  const activity = await getGuestRegistrationsForOrganizer({
    activityId,
    organizerId: viewerProfile.id,
  });

  if (!activity) {
    notFound();
  }

  const activeCount = activity.guestRegistrations
    .filter((registration) => registration.status === "ACTIVE")
    .reduce((sum, registration) => sum + registration.attendeeCount, 0);

  return (
    <PageContainer className="space-y-5 py-5 sm:py-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-moss transition hover:text-ink"
        href={withLocale(locale, `/activities/${activity.id}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        返回活动详情
      </Link>

      <section className="rounded-[1.5rem] bg-white/86 p-5 shadow-sm ring-1 ring-[#ead7b8] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#9a7448]">
              微信 H5 游客报名
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">
              {activity.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              当前游客报名 {activeCount}
              {activity.capacity > 0 ? ` / ${activity.capacity}` : ""} 人
            </p>
          </div>
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#fff8ec] px-4 text-sm font-semibold text-[#7e5f3a] ring-1 ring-[#ead7b8]">
            <UsersRound className="h-4 w-4" />
            {activity.guestRegistrations.length} 条记录
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] bg-white/86 shadow-sm ring-1 ring-[#ead7b8]">
        <div className="flex items-center justify-between gap-3 border-b border-[#ead7b8] px-4 py-3">
          <h2 className="font-semibold text-ink">报名名单</h2>
          <a
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#7e5f3a] ring-1 ring-[#ead7b8] transition hover:bg-[#fff8ec]"
            href={`/api/activities/${activity.id}/guest-registrations`}
          >
            <Download className="h-3.5 w-3.5" />
            导出 CSV
          </a>
        </div>

        {activity.guestRegistrations.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">
            暂时还没有游客报名。
          </div>
        ) : (
          <div className="divide-y divide-[#f0e2cb]">
            {activity.guestRegistrations.map((registration) => (
              <article
                className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={registration.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">
                      {registration.displayName}
                    </p>
                    <span className="rounded-full bg-[#fff8ec] px-2 py-0.5 text-xs font-semibold text-[#7e5f3a]">
                      {registration.attendeeCount} 人
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-[#ead7b8]">
                      {registration.status === "ACTIVE" ? "有效" : "已取消"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    联系方式：{registration.contactEncrypted ?? "未填写"}
                  </p>
                  {registration.note ? (
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      备注：{registration.note}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-500">
                  {formatDate(registration.joinedAt, locale)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
