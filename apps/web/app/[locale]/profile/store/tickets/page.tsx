import { notFound } from "next/navigation";
import { MerchantTicketList } from "@/features/merchants/components/MerchantTicketPages";
import { getMerchantOwnedTickets } from "@/features/merchants/queries/getMerchantOwnedTickets";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantTicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/store/tickets");
  const overview = await getMerchantOwnedTickets(profile.id);
  if (!overview) notFound();

  return (
    <MerchantTicketList
      locale={locale}
      merchantName={overview.merchant.name}
      tickets={overview.tickets}
    />
  );
}
