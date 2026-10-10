import { notFound } from "next/navigation";
import {
  TicketWorkbenchArtwork,
  TicketWorkbenchLayout,
} from "@/features/inventory/components/TicketWorkbenchLayout";
import { getTicketRedemptionHistory } from "@/features/inventory/services/ticketRedemptionHistoryService";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";
import { MerchantTicketHistoryList } from "@/features/merchants/components/MerchantTicketHistoryList";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketWorkbenchAllHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
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
    `/profile/ticket-workbench/${definitionId}/history-all`,
  );
  const [ticket, history] = await Promise.all([
    prisma.inventoryItemDefinition.findUnique({
      where: { id: definitionId },
      select: {
        title: true,
        imageUrl: true,
        merchant: { select: { name: true } },
      },
    }),
    getTicketRedemptionHistory({
      actorProfileId: profile.id,
      definitionId,
      isAdmin: await isCurrentUserAdmin(),
      page,
      scope: "all",
    }),
  ]);
  if (!ticket || !history) notFound();
  const copy = getTicketWorkbenchCopy(locale);

  return (
    <TicketWorkbenchLayout
      backPath={`/profile/ticket-workbench/${encodeURIComponent(definitionId)}`}
      locale={locale}
      title={copy.allHistory}
    >
      <div className="max-w-2xl">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-fog/70 p-3">
          <TicketWorkbenchArtwork
            className="h-16 w-16 rounded-xl"
            imageUrl={ticket.imageUrl}
            locale={locale}
            title={ticket.title}
          />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-bold text-ink">
              {ticket.title}
            </p>
            {ticket.merchant?.name ? (
              <p className="mt-1 truncate text-xs text-ink/70">
                {ticket.merchant.name}
              </p>
            ) : null}
          </div>
        </div>
        <MerchantTicketHistoryList
          definitionId={definitionId}
          history={history}
          historyBasePath={`/profile/ticket-workbench/${encodeURIComponent(definitionId)}/history-all`}
          locale={locale}
        />
      </div>
    </TicketWorkbenchLayout>
  );
}
