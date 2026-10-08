import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TicketRedemptionPreview } from "@/features/inventory/components/TicketRedemptionPreview";
import { getTicketRedemptionPreview } from "@/features/inventory/actions/ticketRedemptionActions";
import { normalizeFriemiCode } from "@/features/inventory/friemiCode";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function TicketRedemptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{
    definitionId?: string;
    holderCode?: string;
    source?: string;
  }>;
}) {
  const { locale, token } = await params;
  const { definitionId, holderCode, source } = await searchParams;
  const holderFriendCode =
    normalizeFriemiCode(typeof holderCode === "string" ? holderCode : "") ??
    undefined;
  await ensureCurrentUserProfile(locale, `/tickets/redeem/${token}`);
  const preview = await getTicketRedemptionPreview(
    token,
    locale,
    definitionId,
    holderFriendCode,
  );
  const copy = getTicketRedemptionCopy(locale);
  const returnQuery = new URLSearchParams();
  if (definitionId) returnQuery.set("definitionId", definitionId);
  if (source === "admin") returnQuery.set("source", "admin");
  const scannerPath = `/tickets/redeem${returnQuery.size ? `?${returnQuery.toString()}` : ""}`;

  return (
    <main className="app-mobile-page-shell mx-auto min-h-svh w-full max-w-xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-10">
      <header className="flex items-center gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, scannerPath)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#111210]">{copy.pageTitle}</h1>
      </header>
      <div className="mt-6">
        <TicketRedemptionPreview
          expectedDefinitionId={definitionId}
          holderFriendCode={holderFriendCode}
          initialPreview={preview}
          locale={locale}
          token={token}
        />
      </div>
    </main>
  );
}
