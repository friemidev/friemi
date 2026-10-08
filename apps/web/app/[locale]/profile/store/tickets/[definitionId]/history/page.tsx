import { notFound } from "next/navigation";
import {
  MerchantTicketFrame,
  MerchantTicketSubhead,
} from "@/features/merchants/components/MerchantTicketPages";
import { MerchantTicketHistoryList } from "@/features/merchants/components/MerchantTicketHistoryList";
import { getMerchantTicketCopy } from "@/features/merchants/merchantTicketCopy";
import { getMerchantOwnedTickets } from "@/features/merchants/queries/getMerchantOwnedTickets";
import { getTicketRedemptionHistory } from "@/features/inventory/services/ticketRedemptionHistoryService";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantTicketHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { definitionId, locale } = await params;
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1));
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/tickets/${definitionId}/history`,
  );
  const overview = await getMerchantOwnedTickets(profile.id);
  const ticket = overview?.tickets.find((item) => item.id === definitionId);
  if (!overview || !ticket) notFound();

  const history = await getTicketRedemptionHistory({
    actorProfileId: profile.id,
    definitionId,
    isAdmin: false,
    page,
    scope: "all",
  });
  if (!history) notFound();
  const copy = getMerchantTicketCopy(locale);

  return (
    <MerchantTicketFrame
      backHref={`/profile/store/tickets/${definitionId}`}
      backLabel={copy.backToTicket}
      locale={locale}
      title={copy.history}
    >
      <MerchantTicketSubhead imageUrl={ticket.imageUrl} title={ticket.title} />
      <MerchantTicketHistoryList
        definitionId={definitionId}
        history={history}
        locale={locale}
      />
    </MerchantTicketFrame>
  );
}
