import { notFound } from "next/navigation";
import {
  MerchantTicketFrame,
  MerchantTicketSubhead,
} from "@/features/merchants/components/MerchantTicketPages";
import { MerchantTicketStaff } from "@/features/merchants/components/MerchantTicketStaff";
import { getMerchantTicketCopy } from "@/features/merchants/merchantTicketCopy";
import { getMerchantOwnedTickets } from "@/features/merchants/queries/getMerchantOwnedTickets";
import { getTicketAccessDetail } from "@/features/inventory/services/ticketAccessService";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantTicketStaffPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/tickets/${definitionId}/staff`,
  );
  const overview = await getMerchantOwnedTickets(profile.id);
  const ticket = overview?.tickets.find((item) => item.id === definitionId);
  if (!overview || !ticket) notFound();

  const detail = await getTicketAccessDetail({
    actorProfileId: profile.id,
    definitionId,
    isAdmin: false,
  });
  if (!detail || detail.definition.merchantId !== overview.merchant.id) {
    notFound();
  }
  const copy = getMerchantTicketCopy(locale);

  return (
    <MerchantTicketFrame
      backHref={`/profile/store/tickets/${definitionId}`}
      backLabel={copy.backToTicket}
      locale={locale}
      title={copy.staff}
    >
      <MerchantTicketSubhead imageUrl={ticket.imageUrl} title={ticket.title} />
      <MerchantTicketStaff
        definitionId={definitionId}
        locale={locale}
        staff={detail.staff}
      />
    </MerchantTicketFrame>
  );
}
