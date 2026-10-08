import Link from "next/link";
import { ArrowLeft, BadgeCheck, Ticket, TicketCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { InventoryItemArtwork } from "@/features/inventory/components/InventoryItemArtwork";
import { ReceivedTicketsSeen } from "@/features/inventory/components/ReceivedTicketsSeen";
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
}: {
  params: Promise<{ definitionId: string; itemId: string; locale: string }>;
}) {
  const { definitionId, itemId, locale } = await params;
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

  return (
    <main className="app-mobile-page-shell mx-auto min-h-svh w-full max-w-2xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-10">
      <ReceivedTicketsSeen locale={locale} />
      <header className="flex items-center gap-3">
        <Link
          aria-label={copy.backToBag}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, `/profile/bag/items/${definitionId}`)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#111210]">{copy.myTicket}</h1>
      </header>

      <div className="mt-6 overflow-hidden rounded-[1.4rem] bg-forest text-white shadow-[0_18px_42px_rgba(20,62,42,0.17)]">
        {ticket.definition.imageUrl ? (
          <InventoryItemArtwork
            alt={ticket.definition.title}
            className="aspect-[4/3] w-full bg-[#F3F5EF]"
            fit="contain"
            imageUrl={ticket.definition.imageUrl}
          />
        ) : null}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.08em] text-white/65">
                FRIEMI · {copy.ticket}
              </p>
              <h2 className="mt-2 text-2xl font-black leading-tight">
                {ticket.definition.title}
              </h2>
            </div>
            <Ticket
              aria-hidden="true"
              className="h-7 w-7 shrink-0 text-white/70"
            />
          </div>
          {ticket.definition.description ? (
            <p className="mt-3 text-sm leading-6 text-white/75">
              {ticket.definition.description}
            </p>
          ) : null}
          <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4 text-sm">
            <span className="text-white/65">{copy.serial}</span>
            <span className="font-bold tabular-nums">
              {ticket.serialNumber}
            </span>
          </div>
        </div>
      </div>

      {ticket.redeemedAt ? (
        <section className="mt-5 flex items-start gap-3 rounded-[1.25rem] bg-[#EAF5E8] p-5 text-[#156240]">
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
          <TicketRedemptionCode itemId={ticket.id} locale={locale} />
        </div>
      )}

      {ticket.giftedAt ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#667065]">
          <BadgeCheck aria-hidden="true" className="h-4 w-4" />
          {locale === "fr"
            ? "Ce billet ne peut plus être offert."
            : locale === "en"
              ? "This ticket cannot be gifted again."
              : "这张票已赠送过，不能再次赠送。"}
        </p>
      ) : null}
    </main>
  );
}
