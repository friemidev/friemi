import Link from "next/link";
import type { ReportStatus } from "@prisma/client";
import {
  ExternalLink,
  Flag,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { PageContainer } from "@/components/layout/PageContainer";
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
            <span>{t.admin.reason}: {t.reasons[report.reason]}</span>
            <span>
              {t.admin.submittedAt}: {formatActivityDate(report.createdAt, locale)}
            </span>
          </div>
        </div>

        {report.targetHref ? (
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
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
  const [reports, summary] = await Promise.all([
    getAdminReports({
      status: selectedStatus as ReportStatus | "ALL",
    }),
    getAdminReportSummary(),
  ]);

  return (
    <PageContainer className="space-y-5 pb-32 md:space-y-6 md:pb-10 lg:!max-w-[96rem]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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

        <div className="grid grid-cols-2 gap-3 sm:w-[22rem]">
          <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/10">
            <ShieldQuestion className="h-5 w-5 text-amber-700" />
            <p className="mt-2 text-2xl font-semibold text-ink">
              {summary.pending}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t.pending(summary.pending)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-black/10">
            <ShieldCheck className="h-5 w-5 text-moss" />
            <p className="mt-2 text-2xl font-semibold text-ink">
              {summary.total}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t.total(summary.total)}
            </p>
          </div>
        </div>
      </div>

      <nav
        aria-label={t.statusFilterLabel}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {reportStatusFilters.map((filter) => {
          const isActive = selectedStatus === filter;

          return (
            <Link
              key={filter}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium ring-1 transition ${
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
