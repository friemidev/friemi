import Link from "next/link";
import { ChevronLeft, ChevronRight, History, ScanLine } from "lucide-react";
import { TicketAccessInvitationActions } from "@/features/inventory/components/TicketAccessInvitationActions";
import {
  TicketWorkbenchArtwork,
  TicketWorkbenchLayout,
} from "@/features/inventory/components/TicketWorkbenchLayout";
import { getTicketWorkbench } from "@/features/inventory/services/ticketAccessService";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketWorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: rawPage } = await searchParams;
  const requestedPage = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1),
  );
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/ticket-workbench",
  );
  const workbench = await getTicketWorkbench({
    actorProfileId: profile.id,
    isAdmin: await isCurrentUserAdmin(),
    page: requestedPage,
  });
  const copy = getTicketWorkbenchCopy(locale);
  const totalPages = Math.max(
    1,
    Math.ceil(workbench.total / workbench.pageSize),
  );
  const pageHref = (targetPage: number) =>
    withLocale(locale, `/profile/ticket-workbench?page=${targetPage}`);

  return (
    <TicketWorkbenchLayout
      backPath="/profile"
      locale={locale}
      title={copy.title}
    >
      {workbench.invitations.length > 0 ? (
        <section aria-labelledby="ticket-workbench-invitations">
          <h2
            className="text-sm font-bold text-ink"
            id="ticket-workbench-invitations"
          >
            {copy.invitations}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {workbench.invitations.map((invitation) => (
              <article
                className="rounded-2xl bg-fog/70 p-4"
                key={invitation.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <TicketWorkbenchArtwork
                    className="h-14 w-14 rounded-xl"
                    imageUrl={invitation.imageUrl}
                    locale={locale}
                    title={invitation.title}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">
                      {invitation.title}
                    </p>
                    {invitation.merchantName ? (
                      <p className="mt-1 truncate text-xs text-ink/70">
                        {invitation.merchantName}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs font-semibold text-ink/70">
                  {invitation.invitedByNickname
                    ? copy.invitedBy(invitation.invitedByNickname)
                    : copy.invitedUnknown}
                </p>
                <TicketAccessInvitationActions
                  invitationId={invitation.id}
                  locale={locale}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="ticket-workbench-list"
        className={workbench.invitations.length > 0 ? "mt-9" : ""}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h2
              className="text-base font-bold text-ink"
              id="ticket-workbench-list"
            >
              {copy.ticketCount(workbench.total)}
            </h2>
            {workbench.tickets.length > 0 ? (
              <p className="mt-1 text-sm text-ink/70">{copy.chooseTicket}</p>
            ) : null}
          </div>
        </div>

        {workbench.tickets.length > 0 ? (
          <>
            <div className="mt-4 space-y-1 rounded-2xl bg-fog/70 p-2">
              {workbench.tickets.map((ticket) => (
                <Link
                  className="flex min-h-20 min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:gap-4 sm:px-3"
                  href={withLocale(
                    locale,
                    `/profile/ticket-workbench/${encodeURIComponent(ticket.id)}`,
                  )}
                  key={ticket.id}
                >
                  <TicketWorkbenchArtwork
                    imageUrl={ticket.imageUrl}
                    locale={locale}
                    title={ticket.title}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {ticket.title}
                    </span>
                    {ticket.merchantName ? (
                      <span className="mt-1 block truncate text-xs text-ink/70">
                        {ticket.merchantName}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-ink/50"
                  />
                </Link>
              ))}
            </div>
            {totalPages > 1 ? (
              <nav
                aria-label={copy.pagination}
                className="mt-5 flex items-center justify-between gap-3"
              >
                {workbench.page > 1 ? (
                  <Link
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-fog px-3 text-sm font-semibold text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    href={pageHref(workbench.page - 1)}
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    {copy.previous}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs font-semibold text-ink/70">
                  {copy.page(workbench.page, totalPages)}
                </span>
                {workbench.page < totalPages ? (
                  <Link
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-fog px-3 text-sm font-semibold text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    href={pageHref(workbench.page + 1)}
                  >
                    {copy.next}
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        ) : workbench.invitations.length === 0 &&
          workbench.pastTickets.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-fog/70 px-6 py-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-fog text-forest">
              <ScanLine aria-hidden="true" className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-bold text-ink">{copy.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/70">
              {copy.emptyHint}
            </p>
          </div>
        ) : null}
      </section>

      {workbench.pastTickets.length > 0 ? (
        <section aria-labelledby="ticket-workbench-past" className="mt-9">
          <h2
            className="text-base font-bold text-ink"
            id="ticket-workbench-past"
          >
            {copy.pastTickets}
          </h2>
          <p className="mt-1 text-sm text-ink/70">{copy.pastHint}</p>
          <div className="mt-4 space-y-1 rounded-2xl bg-fog/70 p-2">
            {workbench.pastTickets.map((ticket) => (
              <Link
                className="flex min-h-16 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(
                  locale,
                  `/profile/ticket-workbench/${encodeURIComponent(ticket.id)}/history`,
                )}
                key={ticket.id}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-forest">
                  <History aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {ticket.title}
                  </span>
                  <span className="mt-1 block text-xs text-ink/70">
                    {copy.historyCount(ticket.ownRedemptionCount)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-ink/50"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </TicketWorkbenchLayout>
  );
}
