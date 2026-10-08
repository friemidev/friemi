import Link from "next/link";
import { ArrowLeft, BadgeCheck, Ticket, TicketCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { InventoryItemArtwork } from "@/features/inventory/components/InventoryItemArtwork";
import { TicketRedemptionCode } from "@/features/inventory/components/TicketRedemptionCode";
import { getOwnedTicketForProfile } from "@/features/inventory/services/ticketWalletQueries";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function OwnedTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ definitionId: string; itemId: string; locale: string }>;
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { definitionId, itemId, locale } = await params;
  const { filter, page } = await searchParams;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/bag/items/${definitionId}/${itemId}`,
  );
  const ticket = await getOwnedTicketForProfile({
    itemId,
    profileId: profile.id,
  });
  if (!ticket || ticket.definition.id !== definitionId) notFound();
  const copy = getTicketRedemptionCopy(locale);
  const bagQuery = new URLSearchParams();
  if (filter === "all" || filter === "used" || filter === "available") {
    bagQuery.set("filter", filter);
  }
  const pageNumber = Number(page);
  if (page && Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 1000) {
    bagQuery.set("page", String(pageNumber));
  }
  const bagPath = `/profile/bag${bagQuery.size ? `?${bagQuery.toString()}` : ""}`;

  return (
    <main className="app-mobile-page-shell mx-auto min-h-svh w-full max-w-2xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-10">
      <header className="flex items-center gap-3">
        <Link
          aria-label={copy.backToBag}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, bagPath)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#111210]">{copy.myTicket}</h1>
      </header>

      <section className="mt-6 flex items-center gap-4 rounded-[1.4rem] bg-forest p-4 text-white shadow-[0_18px_42px_rgba(20,62,42,0.12)] sm:p-5">
        {ticket.definition.imageUrl ? (
          <InventoryItemArtwork
            alt={ticket.definition.title}
            className="h-20 w-20 shrink-0 rounded-xl bg-paper sm:h-24 sm:w-24"
            fit="contain"
            imageUrl={ticket.definition.imageUrl}
          />
        ) : (
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-white/15 sm:h-24 sm:w-24">
            <Ticket aria-hidden="true" className="h-8 w-8" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.08em] text-white/70">
            FRIEMI · {copy.ticket}
          </p>
          <h2 className="mt-1.5 text-xl font-bold leading-tight">
            {ticket.definition.title}
          </h2>
          {ticket.definition.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/75">
              {ticket.definition.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-semibold text-white/80">
            {ticket.redeemedAt ? copy.checkedIn : copy.ready}
          </p>
        </div>
      </section>

      {ticket.redeemedAt ? (
        <section className="mt-5 flex items-start gap-3 rounded-[1.25rem] bg-fog p-5 text-forest">
          <TicketCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-bold">{copy.redeemed}</h2>
            <p className="mt-1 text-sm">
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(ticket.redeemedAt))}
            </p>
          </div>
        </section>
      ) : (
        <div className="mt-5">
          <TicketRedemptionCode
            holderFriemiCode={profile.friendCode}
            itemId={ticket.id}
            locale={locale}
          />
        </div>
      )}

      {ticket.giftedAt ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink/70">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          {copy.giftLocked}
        </p>
      ) : null}
    </main>
  );
}
