import Link from "next/link";
import type { ReportStatus, ReportTargetType } from "@prisma/client";
import {
  Clock3,
  ExternalLink,
  Flag,
  MousePointerClick,
  ShieldCheck,
  ShieldQuestion,
  TrendingUp,
} from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  getAdminOperationsAnalytics,
  type AdminOperationsAnalytics,
} from "@/features/analytics/queries/getAdminOperationsAnalytics";
import { AdminReportReviewForm } from "@/features/reports/components/AdminReportReviewForm";
import { getReportCopy } from "@/features/reports/copy";
import {
  getAdminReportSummary,
  getAdminReports,
  type AdminReportViewModel,
} from "@/features/reports/queries/getAdminReports";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
};

const reportStatusFilters = [
  "ALL",
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
] as const;

const reportTargetTypeOrder = [
  "USER_PROFILE",
  "PUBLIC_EVENT",
  "ACTIVITY",
  "COMMENT",
] as const satisfies readonly ReportTargetType[];

type ReportStatusFilter = (typeof reportStatusFilters)[number];

function parseStatusFilter(status: string | undefined): ReportStatusFilter {
  return reportStatusFilters.includes(status as ReportStatusFilter)
    ? (status as ReportStatusFilter)
    : "ALL";
}

function getStatusFilterHref(locale: string, status: ReportStatusFilter) {
  if (status === "ALL") {
    return withLocale(locale, "/admin/reports");
  }

  return withLocale(locale, `/admin/reports?status=${status}`);
}

function getStatusTone(status: AdminReportViewModel["status"]) {
  if (status === "PENDING") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (status === "REVIEWING") {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }

  if (status === "RESOLVED") {
    return "bg-moss/10 text-moss ring-moss/20";
  }

  return "bg-zinc-100 text-zinc-600 ring-zinc-200";
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

function formatAverageReviewTime(
  analytics: ReturnType<typeof getReportCopy>["admin"]["analytics"],
  hours: number | null,
) {
  if (hours === null) {
    return analytics.noReviewTime;
  }

  if (hours < 1) {
    return analytics.lessThanOneHour;
  }

  return analytics.hours(hours);
}

function AdminOperationsOverview({
  locale,
  operations,
}: {
  locale: string;
  operations: AdminOperationsAnalytics;
}) {
  const t = getReportCopy(locale);
  const analytics = t.admin.analytics;
  const targetTotal = reportTargetTypeOrder.reduce(
    (total, targetType) => total + operations.reports.byTargetType[targetType],
    0,
  );
  const metrics = [
    {
      icon: Flag,
      label: analytics.newReports,
      tone: "bg-[#fff7ed] text-clay ring-[#f1c6ae]",
      value: operations.reports.newCount,
    },
    {
      icon: ShieldQuestion,
      label: analytics.pendingReports,
      tone: "bg-amber-50 text-amber-800 ring-amber-200",
      value: operations.reports.pendingCount,
    },
    {
      icon: Clock3,
      label: analytics.averageReviewTime,
      tone: "bg-[#eef5ea] text-moss ring-[#c1d2ba]",
      value: formatAverageReviewTime(
        analytics,
        operations.reports.averageReviewHours,
      ),
    },
    {
      icon: TrendingUp,
      label: analytics.publicEventTeams,
      tone: "bg-sky-50 text-sky-800 ring-sky-200",
      value: operations.publicEvents.convertedToTeamCount,
    },
  ];

  return (
    <section className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.75fr)]">
      <div className="min-w-0 rounded-[1.5rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {analytics.operationsTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {analytics.operationsDescription(operations.windowDays)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className="min-w-0 rounded-2xl bg-paper/70 p-2.5 ring-1 ring-black/5 sm:p-4"
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 sm:h-9 sm:w-9 ${metric.tone}`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <p className="mt-1.5 truncate text-xl font-semibold tracking-normal text-ink sm:mt-3 sm:text-2xl">
                  {metric.value}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500 sm:text-sm">
                  {metric.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
          <div className="min-w-0 rounded-2xl bg-paper/70 p-2.5 ring-1 ring-black/5 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MousePointerClick className="h-4 w-4 text-moss" />
              <span className="truncate">{analytics.sourceClicks}</span>
            </div>
            <p className="mt-1.5 text-xl font-semibold text-ink sm:mt-2 sm:text-2xl">
              {operations.publicEvents.sourceClickCount}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-paper/70 p-2.5 ring-1 ring-black/5 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <TrendingUp className="h-4 w-4 text-moss" />
              <span className="truncate">{analytics.conversionRate}</span>
            </div>
            <p className="mt-1.5 text-xl font-semibold text-ink sm:mt-2 sm:text-2xl">
              {operations.publicEvents.conversionRate}%
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-[1.5rem] border border-black/10 bg-white/82 p-3 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold text-ink">
          {analytics.targetDistribution}
        </h2>
        {targetTotal === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-paper/70 p-3 text-sm text-zinc-500 sm:mt-4 sm:p-4">
            {analytics.noTargetDistribution}
          </p>
        ) : (
          <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
            {reportTargetTypeOrder.map((targetType) => {
              const count = operations.reports.byTargetType[targetType];
              const percentage =
                targetTotal > 0 ? Math.round((count / targetTotal) * 100) : 0;

              return (
                <div key={targetType} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">
                      {t.targetTypes[targetType]}
                    </span>
                    <span className="text-zinc-500">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-moss"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ReportCard({
  locale,
  report,
}: {
  locale: string;
  report: AdminReportViewModel;
}) {
  const t = getReportCopy(locale);
  const targetLabel = report.targetLabel || t.admin.deletedTarget;
  const statusTone = getStatusTone(report.status);

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-black/10 bg-white/82 shadow-sm">
      <div className="grid gap-4 border-b border-black/10 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#eef5ea] px-2.5 py-1 text-xs font-semibold text-moss ring-1 ring-moss/15">
              {t.targetTypes[report.targetType]}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusTone}`}
            >
              {t.statuses[report.status]}
            </span>
          </div>
          <h2 className="mt-3 line-clamp-2 text-xl font-semibold tracking-normal text-ink">
            {targetLabel}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            <span>
              {t.admin.reason}: {t.reasons[report.reason]}
            </span>
            <span>
              {t.admin.submittedAt}:{" "}
              {formatActivityDate(report.createdAt, locale)}
            </span>
          </div>
        </div>

        {report.targetHref ? (
          <Link
            className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50 sm:w-auto"
            href={withLocale(locale, report.targetHref)}
          >
            {t.admin.openTarget}
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-paper/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t.admin.reporter}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-moss text-sm font-semibold text-white">
                {report.reporter.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.reporter.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitial(report.reporter.nickname)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {report.reporter.nickname}
                </p>
                <Link
                  className="text-sm text-moss hover:text-ink"
                  href={withLocale(locale, `/profile/${report.reporter.id}`)}
                >
                  {t.admin.openReporter}
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {t.descriptionLabel}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-700">
              {report.description || t.admin.noDescription}
            </p>
          </div>

          {report.reviewer ? (
            <p className="text-sm text-zinc-500">
              {t.admin.reviewedBy(report.reviewer.nickname)}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-paper/80 p-4">
          <AdminReportReviewForm
            locale={locale}
            reportId={report.id}
            reviewNote={report.reviewNote}
            status={report.status}
          />
        </div>
      </div>
    </article>
  );
}

export default async function AdminReportsPage({
  params,
  searchParams,
}: AdminReportsPageProps) {
  const { locale } = await params;
  const { status } = await searchParams;
  const selectedStatus = parseStatusFilter(status);
  await requireAdminPageAccess(locale);
  const t = getReportCopy(locale).admin;
  const isFiltered = selectedStatus !== "ALL";
  const [reports, summary, operations] = await Promise.all([
    getAdminReports({
      status: selectedStatus as ReportStatus | "ALL",
    }),
    getAdminReportSummary(),
    getAdminOperationsAnalytics(),
  ]);

  return (
    <PageContainer className="max-w-full space-y-5 overflow-x-hidden pb-32 md:space-y-6 md:pb-10 lg:!max-w-[96rem]">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t.eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-ink">
            {t.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-zinc-600">
            {t.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-[22rem] sm:gap-3">
          <div className="min-w-0 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/10 sm:p-4">
            <ShieldQuestion className="h-4 w-4 text-amber-700 sm:h-5 sm:w-5" />
            <p className="mt-1.5 text-xl font-semibold text-ink sm:mt-2 sm:text-2xl">
              {summary.pending}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
              {t.pending(summary.pending)}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/10 sm:p-4">
            <ShieldCheck className="h-4 w-4 text-moss sm:h-5 sm:w-5" />
            <p className="mt-1.5 text-xl font-semibold text-ink sm:mt-2 sm:text-2xl">
              {summary.total}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
              {t.total(summary.total)}
            </p>
          </div>
        </div>
      </div>

      <AdminOperationsOverview locale={locale} operations={operations} />

      <nav
        aria-label={t.statusFilterLabel}
        className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-3 sm:flex sm:flex-wrap"
      >
        {reportStatusFilters.map((filter) => {
          const isActive = selectedStatus === filter;

          return (
            <Link
              key={filter}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-10 min-w-0 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 transition ${
                isActive
                  ? "bg-ink text-white ring-ink"
                  : "bg-white/80 text-zinc-600 ring-black/10 hover:bg-white hover:text-ink"
              }`}
              href={getStatusFilterHref(locale, filter)}
            >
              {t.statusFilters[filter]}
            </Link>
          );
        })}
      </nav>

      {reports.length === 0 ? (
        <section className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
          <Flag className="mx-auto h-8 w-8 text-zinc-400" />
          <h2 className="mt-3 text-xl font-semibold text-ink">
            {isFiltered ? t.emptyFilteredTitle : t.emptyTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {isFiltered ? t.emptyFilteredDescription : t.emptyDescription}
          </p>
        </section>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <ReportCard key={report.id} locale={locale} report={report} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
