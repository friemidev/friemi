import Link from "next/link";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { notFound } from "next/navigation";
import { TicketWorkbenchLayout } from "@/features/inventory/components/TicketWorkbenchLayout";
import { getTicketRedemptionHistory } from "@/features/inventory/services/ticketRedemptionHistoryService";
import { canRedeemTicketDefinition } from "@/features/inventory/services/ticketRedemptionService";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketWorkbenchHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; definitionId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { definitionId, locale } = await params;
  const { page: rawPage } = await searchParams;
  const page = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1),
  );
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/ticket-workbench/${definitionId}/history`,
  );
  const isAdmin = await isCurrentUserAdmin();
  const [ticket, history, canCheckIn] = await Promise.all([
    prisma.inventoryItemDefinition.findUnique({
      where: { id: definitionId },
      select: { title: true },
    }),
    getTicketRedemptionHistory({
      actorProfileId: profile.id,
      definitionId,
      isAdmin,
      page,
      scope: "mine",
    }),
    canRedeemTicketDefinition({
      actorProfileId: profile.id,
      definitionId,
      isAdmin,
    }),
  ]);
  if (!ticket || !history) notFound();

  const copy = getTicketWorkbenchCopy(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "full" });
  const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
  const totalPages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const pageHref = (targetPage: number) =>
    withLocale(
      locale,
      `/profile/ticket-workbench/${encodeURIComponent(definitionId)}/history?page=${targetPage}`,
    );
  let previousDate = "";

  return (
    <TicketWorkbenchLayout
      backPath={
        canCheckIn
          ? `/profile/ticket-workbench/${encodeURIComponent(definitionId)}`
          : "/profile/ticket-workbench"
      }
      locale={locale}
      title={copy.historyTitle}
    >
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-ink/70">{ticket.title}</p>
        <p className="mt-1 text-sm text-ink/70">
          {copy.historyCount(history.total)}
        </p>

        {history.records.length > 0 ? (
          <ol className="mt-6 space-y-6">
            {history.records.map((record) => {
              const redeemedAt = new Date(record.redeemedAt);
              const date = dateFormat.format(redeemedAt);
              const showDate = date !== previousDate;
              previousDate = date;
              const method =
                record.method === "QR"
                  ? copy.qr
                  : record.method === "MANUAL"
                    ? copy.manual
                    : copy.unknownMethod;

              return (
                <li key={record.id}>
                  {showDate ? (
                    <h2 className="mb-2 text-xs font-bold text-ink/70">
                      {date}
                    </h2>
                  ) : null}
                  <div className="flex min-w-0 items-start gap-4 rounded-xl bg-fog/70 px-4 py-4 sm:px-5">
                    <time
                      className="w-14 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-forest"
                      dateTime={record.redeemedAt}
                    >
                      {timeFormat.format(redeemedAt)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-ink">
                        {copy.holder} · {record.holder.nickname}
                      </p>
                      {record.holder.friendCode ? (
                        <p className="mt-1 font-mono text-xs tracking-[0.06em] text-ink/70">
                          {record.holder.friendCode}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-fog px-2.5 py-1 text-xs font-semibold text-forest">
                      {method}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-6 rounded-2xl bg-fog/70 px-6 py-12 text-center">
            <History
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-forest"
            />
            <p className="mt-4 text-sm font-semibold text-ink/70">
              {copy.historyEmpty}
            </p>
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label={copy.pagination}
            className="mt-7 flex items-center justify-between gap-3"
          >
            {history.page > 1 ? (
              <Link
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={pageHref(history.page - 1)}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                {copy.previous}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs font-semibold text-ink/70">
              {copy.page(history.page, totalPages)}
            </span>
            {history.page < totalPages ? (
              <Link
                className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={pageHref(history.page + 1)}
              >
                {copy.next}
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </TicketWorkbenchLayout>
  );
}
