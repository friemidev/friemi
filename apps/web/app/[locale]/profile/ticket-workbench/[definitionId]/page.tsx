import Link from "next/link";
import { ChevronRight, History, ScanLine, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import {
  TicketWorkbenchArtwork,
  TicketWorkbenchLayout,
} from "@/features/inventory/components/TicketWorkbenchLayout";
import {
  canManageTicketDefinition,
  getTicketWorkbenchTicket,
} from "@/features/inventory/services/ticketAccessService";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketWorkbenchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; definitionId: string }>;
}) {
  const { definitionId, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/ticket-workbench/${definitionId}`,
  );
  const isAdmin = await isCurrentUserAdmin();
  const [ticket, canManage] = await Promise.all([
    getTicketWorkbenchTicket({
      actorProfileId: profile.id,
      definitionId,
      isAdmin,
    }),
    canManageTicketDefinition({
      actorProfileId: profile.id,
      definitionId,
      isAdmin,
    }),
  ]);
  if (!ticket) notFound();
  const copy = getTicketWorkbenchCopy(locale);

  return (
    <TicketWorkbenchLayout
      backPath="/profile/ticket-workbench"
      locale={locale}
      title={ticket.title}
    >
      <div className="max-w-2xl">
        <div className="flex min-w-0 items-center gap-4">
          <TicketWorkbenchArtwork
            className="h-20 w-20 rounded-2xl sm:h-24 sm:w-24"
            imageUrl={ticket.imageUrl}
            locale={locale}
            title={ticket.title}
          />
          <div className="min-w-0 flex-1">
            {ticket.merchantName ? (
              <p className="truncate text-sm font-semibold text-ink/70">
                {ticket.merchantName}
              </p>
            ) : null}
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-forest">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-meadow"
              />
              {copy.independentAccess}
            </p>
          </div>
        </div>

        <Link
          className="mt-8 flex min-h-24 items-center gap-4 rounded-2xl bg-forest px-5 py-5 text-white shadow-[0_16px_36px_rgba(20,62,42,0.14)] transition hover:bg-forest/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest active:scale-[0.99]"
          href={withLocale(
            locale,
            `/tickets/redeem?definitionId=${encodeURIComponent(definitionId)}&source=workbench`,
          )}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10">
            <ScanLine aria-hidden="true" className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">{copy.scan}</span>
            <span className="mt-1 block text-sm leading-5 text-white/75">
              {copy.scanHint}
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0" />
        </Link>

        <Link
          className="mt-4 flex min-h-20 items-center gap-4 rounded-2xl bg-fog/70 px-5 py-4 text-ink transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(
            locale,
            `/profile/ticket-workbench/${encodeURIComponent(definitionId)}/history`,
          )}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-forest">
            <History aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{copy.myHistory}</span>
            <span className="mt-1 block text-xs text-ink/70">
              {copy.historyCount(ticket.ownRedemptionCount)}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-ink/50"
          />
        </Link>

        {canManage ? (
          <section aria-labelledby="ticket-workbench-manager" className="mt-9">
            <h2
              className="text-sm font-bold text-ink"
              id="ticket-workbench-manager"
            >
              {copy.managerActions}
            </h2>
            <div className="mt-3 space-y-1 rounded-2xl bg-fog/70 p-2">
              <Link
                className="flex min-h-20 items-center gap-3 rounded-xl px-3 py-3 text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(
                  locale,
                  `/profile/ticket-workbench/${encodeURIComponent(definitionId)}/staff`,
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-forest">
                  <UsersRound aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{copy.staff}</span>
                  <span className="mt-1 block text-xs text-ink/70">
                    {copy.staffHint}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-ink/50"
                />
              </Link>
              <Link
                className="flex min-h-20 items-center gap-3 rounded-xl px-3 py-3 text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(
                  locale,
                  `/profile/ticket-workbench/${encodeURIComponent(definitionId)}/history-all`,
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-forest">
                  <History aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">
                    {copy.allHistory}
                  </span>
                  <span className="mt-1 block text-xs text-ink/70">
                    {copy.allHistoryHint}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-ink/50"
                />
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </TicketWorkbenchLayout>
  );
}
