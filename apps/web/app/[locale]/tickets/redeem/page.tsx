import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { TicketRedemptionScanner } from "@/features/inventory/components/TicketRedemptionScanner";
import { canRedeemTicketDefinition } from "@/features/inventory/services/ticketRedemptionService";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketRedemptionScannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ definitionId?: string; source?: string }>;
}) {
  const { locale } = await params;
  const { definitionId, source } = await searchParams;
  const profile = await ensureCurrentUserProfile(locale, "/tickets/redeem");
  const definition = definitionId
    ? await prisma.inventoryItemDefinition.findUnique({
        where: { id: definitionId },
        select: { kind: true, title: true },
      })
    : null;
  if (definitionId) {
    const canCheckIn =
      definition?.kind === "EVENT_TICKET" &&
      (await canRedeemTicketDefinition({
        actorProfileId: profile.id,
        definitionId,
        isAdmin: await isCurrentUserAdmin(),
      }));
    if (!canCheckIn) notFound();
  }
  const copy = getTicketRedemptionCopy(locale);
  const backPath = definitionId
    ? source === "admin"
      ? `/admin/items/${definitionId}`
      : source === "store"
        ? `/profile/store/tickets/${definitionId}`
        : source === "workbench"
          ? `/profile/ticket-workbench/${definitionId}`
          : `/profile/bag/items/${definitionId}`
    : "/profile/bag";

  return (
    <main className="app-mobile-page-shell mx-auto min-h-svh w-full max-w-xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-10">
      <header className="flex items-center gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, backPath)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#111210]">
            {copy.pageTitle}
          </h1>
          {definition ? (
            <p className="mt-1 break-words text-sm text-ink/70">
              {copy.currentTicket} · {definition.title}
            </p>
          ) : null}
        </div>
      </header>
      <div className="mt-6">
        <TicketRedemptionScanner
          definitionId={definitionId}
          locale={locale}
          source={source}
        />
      </div>
    </main>
  );
}
