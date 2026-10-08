import { notFound } from "next/navigation";
import { MerchantTicketDetail } from "@/features/merchants/components/MerchantTicketPages";
import { getMerchantOwnedTickets } from "@/features/merchants/queries/getMerchantOwnedTickets";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantTicketPage({
  params,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
}) {
  const { definitionId, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/tickets/${definitionId}`,
  );
  const overview = await getMerchantOwnedTickets(profile.id);
  const ticket = overview?.tickets.find((item) => item.id === definitionId);
  if (!ticket) notFound();

  return <MerchantTicketDetail locale={locale} ticket={ticket} />;
}
