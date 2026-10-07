import { Ticket } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import type { getAdminInventoryDefinition } from "@/features/inventory/services/inventoryService";
import { InventoryItemArtwork } from "@/features/inventory/components/InventoryItemArtwork";
import { withLocale } from "@/lib/routes";

export type AdminInventoryDefinition = NonNullable<
  Awaited<ReturnType<typeof getAdminInventoryDefinition>>
>;

export function AdminItemPageFrame({
  backHref,
  backLabel,
  children,
  compact = false,
  definition,
  locale,
  pageTitle,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  compact?: boolean;
  definition: AdminInventoryDefinition;
  locale: string;
  pageTitle: string;
}) {
  const remaining = definition.totalSupply - definition.issuedCount;
  const itemCopy = getAdminItemCopy(locale);
  const copy = itemCopy.frame;

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, backHref)}
        backLabel={backLabel}
        title={pageTitle}
      />
      <section
        aria-label={definition.title}
        className={
          compact
            ? "grid grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-2xl bg-forest p-4 text-paper sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-4 sm:p-5"
            : "grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 rounded-2xl bg-forest p-5 text-paper sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5 sm:p-6"
        }
      >
        <div
          className={
            compact
              ? "relative grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-paper/10 sm:h-20 sm:w-20"
              : "relative grid h-[6.5rem] w-[6.5rem] place-items-center overflow-hidden rounded-xl bg-paper/10 sm:h-36 sm:w-40"
          }
        >
          {definition.imageUrl ? (
            <InventoryItemArtwork
              alt={copy.imageAlt(definition.title)}
              className="h-full w-full bg-paper"
              fit="contain"
              imageUrl={definition.imageUrl}
            />
          ) : (
            <Ticket aria-hidden="true" className="h-10 w-10 text-paper/80" />
          )}
        </div>
        <div className="min-w-0 self-center">
          <p className="text-xs font-semibold text-paper/75">
            {copy.ticketType}
          </p>
          <h2
            className={`mt-1 break-words font-bold tracking-tight ${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}
          >
            {definition.title}
          </h2>
          {compact ? (
            <p className="mt-1 text-sm text-paper/85">
              {copy.remaining} {remaining}
            </p>
          ) : definition.description ? (
            <p className="mt-2 text-sm leading-6 text-paper/85">
              {definition.description}
            </p>
          ) : null}
        </div>
        {!compact ? (
          <dl className="col-span-2 mt-1 grid grid-cols-2 gap-4 border-t border-paper/20 pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-paper/75">{copy.remaining}</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums">
                {remaining}
              </dd>
            </div>
            <div>
              <dt className="text-paper/75">{copy.allocatedTotal}</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {definition.issuedCount} / {definition.totalSupply}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-paper/75">
                {itemCopy.settings.giftingTitle}
              </dt>
              <dd className="mt-1 font-semibold">
                {definition.isGiftable
                  ? copy.giftingAllowed
                  : copy.giftingPaused}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>
      {children}
    </PageContainer>
  );
}
