import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Gift, ScanLine, Ticket } from "lucide-react";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { TicketGiftForm } from "@/features/inventory/components/TicketGiftForm";
import { InventoryItemArtwork } from "@/features/inventory/components/InventoryItemArtwork";
import { ReceivedTicketsSeen } from "@/features/inventory/components/ReceivedTicketsSeen";
import { getInventoryCopy } from "@/features/inventory/copy";
import { getInventoryDefinitionForProfile } from "@/features/inventory/services/inventoryService";
import { canRedeemTicketDefinition } from "@/features/inventory/services/ticketRedemptionService";
import { getOwnedTicketPage } from "@/features/inventory/services/ticketWalletQueries";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function InventoryItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ definitionId: string; locale: string }>;
  searchParams: Promise<{ page?: string; ticketsPage?: string }>;
}) {
  const { definitionId, locale } = await params;
  const { page: rawPage, ticketsPage: rawTicketsPage } = await searchParams;
  const page = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawPage ?? "1", 10) || 1),
  );
  const requestedTicketsPage = Math.max(
    1,
    Math.min(1000, Number.parseInt(rawTicketsPage ?? "1", 10) || 1),
  );
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/bag/items/${definitionId}`,
  );
  const item = await getInventoryDefinitionForProfile({
    definitionId,
    page,
    profileId: profile.id,
  });
  if (!item) notFound();

  const [ownedTickets, canCheckIn] = await Promise.all([
    getOwnedTicketPage({
      definitionId,
      page: requestedTicketsPage,
      profileId: profile.id,
    }),
    isCurrentUserAdmin().then((isAdmin) =>
      canRedeemTicketDefinition({
        actorProfileId: profile.id,
        definitionId,
        isAdmin,
      }),
    ),
  ]);

  const copy = getInventoryCopy(locale);
  const redemptionCopy = getTicketRedemptionCopy(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const historyHref = (targetPage: number) =>
    withLocale(
      locale,
      `/profile/bag/items/${definitionId}?page=${targetPage}&ticketsPage=${ownedTickets.page}`,
    );
  const ticketsHref = (targetPage: number) =>
    withLocale(
      locale,
      `/profile/bag/items/${definitionId}?page=${page}&ticketsPage=${targetPage}`,
    );

  return (
    <PageContainer
      className="max-w-3xl space-y-5 pb-28 pt-5 md:pb-12 md:pt-10"
      mobileSafeTop
    >
      <ReceivedTicketsSeen locale={locale} />
      <Link
        className="inline-flex items-center gap-2 text-sm font-bold text-[#156240]"
        href={withLocale(locale, "/profile/bag")}
      >
        <ArrowLeft className="h-4 w-4" /> {copy.back}
      </Link>

      <header className="rounded-[1.5rem] bg-forest p-6 text-white shadow-[0_18px_42px_rgba(20,62,42,0.18)] sm:p-8">
        <div
          className={
            item.imageUrl
              ? "grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)]"
              : "flex items-start justify-between gap-4"
          }
        >
          <div
            className={item.imageUrl ? "order-2 min-w-0 sm:order-1" : "min-w-0"}
          >
            <p className="text-xs font-bold tracking-[0.12em] text-white/75">
              FRIEMI · {copy.ticket}
            </p>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
              {item.title}
            </h1>
            {item.description ? (
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                {item.description}
              </p>
            ) : null}
          </div>
          {item.imageUrl ? (
            <InventoryItemArtwork
              alt={item.title}
              className="order-1 aspect-[4/3] w-full rounded-[1rem] ring-1 ring-white/20 sm:order-2"
              fit="contain"
              imageUrl={item.imageUrl}
            />
          ) : (
            <Ticket
              className="h-8 w-8 shrink-0 text-white/75"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/20 pt-5">
          <div>
            <p className="text-xs text-white/65">{copy.owned}</p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {item.quantity}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/65">{copy.available}</p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {item.transferableCount}
            </p>
          </div>
        </div>
      </header>

      {canCheckIn ? (
        <Link
          className="flex items-center gap-4 rounded-[1.2rem] bg-white p-4 text-[#123D31] ring-1 ring-[#D6D5B2] active:scale-[0.99]"
          href={withLocale(
            locale,
            `/tickets/redeem?definitionId=${encodeURIComponent(definitionId)}`,
          )}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EAF5E8] text-[#156240]">
            <ScanLine aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 font-bold">
            {redemptionCopy.checkIn}
          </span>
          <ChevronRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[#627268]"
          />
        </Link>
      ) : null}

      {item.transferableCount > 0 && item.isGiftable ? (
        <TicketGiftForm
          definitionId={item.id}
          initialRequestId={randomUUID()}
          locale={locale}
        />
      ) : (
        <div className="rounded-[1.15rem] bg-[#F3F5EF] px-5 py-4 text-sm text-[#5F635E] ring-1 ring-[#E5E2D3]">
          {item.quantity > 0 && ownedTickets.redeemedCount > 0
            ? redemptionCopy.redeemedNoGift
            : item.quantity > 0 &&
                item.ownedItems.some((owned) => owned.giftedAt)
              ? copy.transferLocked
              : copy.noTickets}
        </div>
      )}

      {ownedTickets.total > 0 ? (
        <section className="rounded-[1.25rem] bg-white p-5 ring-1 ring-[#D6D5B2]">
          <h2 className="text-base font-bold text-[#111210]">
            {copy.ticketList}
          </h2>
          <div className="mt-4 divide-y divide-[#E5E2D3]">
            {ownedTickets.items.map((owned) => (
              <Link
                className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm font-semibold text-[#263B2E]"
                href={withLocale(
                  locale,
                  `/profile/bag/items/${definitionId}/${owned.id}`,
                )}
                key={owned.id}
              >
                <span>
                  {copy.serial} {owned.serialNumber}
                  {owned.redeemedAt ? (
                    <span className="ml-2 text-[#156240]">
                      · {redemptionCopy.redeemed}
                    </span>
                  ) : owned.giftedAt ? (
                    <span className="ml-2 text-[#7A8276]">
                      · {copy.transferLocked}
                    </span>
                  ) : null}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[#7A8276]"
                />
              </Link>
            ))}
          </div>
          {ownedTickets.total > ownedTickets.pageSize ? (
            <nav
              aria-label={redemptionCopy.ticketList}
              className="mt-4 flex items-center justify-between border-t border-[#E5E2D3] pt-4 text-sm"
            >
              {ownedTickets.page > 1 ? (
                <Link
                  className="font-bold text-[#156240]"
                  href={ticketsHref(ownedTickets.page - 1)}
                >
                  {copy.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-[#667065]">
                {ownedTickets.page} /{" "}
                {Math.ceil(ownedTickets.total / ownedTickets.pageSize)}
              </span>
              {ownedTickets.page * ownedTickets.pageSize <
              ownedTickets.total ? (
                <Link
                  className="font-bold text-[#156240]"
                  href={ticketsHref(ownedTickets.page + 1)}
                >
                  {copy.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[1.25rem] bg-white p-5 ring-1 ring-[#D6D5B2] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#111210]">
            <Gift className="h-5 w-5 text-[#156240]" />
            {copy.giftHistory}
          </h2>
          <span className="text-xs font-bold text-[#6C746A]">
            {item.giftCount}
          </span>
        </div>
        {item.history.length ? (
          <ol className="mt-4 divide-y divide-[#E5E2D3]">
            {item.history.map((gift) => {
              const received = gift.recipientProfileId === profile.id;
              return (
                <li
                  className="flex items-start justify-between gap-3 py-3"
                  key={gift.id}
                >
                  <div>
                    <p className="text-sm font-bold text-[#111210]">
                      {received
                        ? gift.sender.nickname
                        : gift.recipient.nickname}
                      <span className="ml-1 font-normal text-[#6C746A]">
                        · {copy.serial} {gift.serialNumber}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[#6C746A]">
                      {received
                        ? gift.sender.friendCode
                        : gift.recipient.friendCode}{" "}
                      ·{" "}
                      {gift.method === "FRIEND_QR"
                        ? copy.methodQr
                        : copy.methodCode}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-right text-xs text-[#6C746A]"
                    dateTime={gift.createdAt}
                  >
                    {dateFormatter.format(new Date(gift.createdAt))}
                  </time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-[#7A8276]">{copy.historyEmpty}</p>
        )}
        {item.giftCount > item.pageSize ? (
          <nav
            aria-label={copy.giftHistory}
            className="mt-5 flex justify-between gap-3 border-t border-[#E5E2D3] pt-4"
          >
            {page > 1 ? (
              <Link
                className="text-sm font-bold text-[#156240]"
                href={historyHref(page - 1)}
              >
                {copy.previous}
              </Link>
            ) : (
              <span />
            )}
            {page * item.pageSize < item.giftCount ? (
              <Link
                className="text-sm font-bold text-[#156240]"
                href={historyHref(page + 1)}
              >
                {copy.next}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </PageContainer>
  );
}
