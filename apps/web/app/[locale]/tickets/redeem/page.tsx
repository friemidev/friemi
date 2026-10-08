import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TicketRedemptionScanner } from "@/features/inventory/components/TicketRedemptionScanner";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { ensureCurrentUserProfile } from "@/lib/auth";
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
  await ensureCurrentUserProfile(locale, "/tickets/redeem");
  const copy = getTicketRedemptionCopy(locale);
  const backPath = definitionId
    ? source === "admin"
      ? `/admin/items/${definitionId}`
      : `/profile/bag/items/${definitionId}`
    : "/profile/bag";

  return (
    <main className="app-mobile-page-shell mx-auto min-h-svh w-full max-w-xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-10">
      <header className="flex items-center gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, backPath)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#111210]">{copy.pageTitle}</h1>
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
