import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  PackageOpen,
  Plus,
  Search,
  Ticket,
} from "lucide-react";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { InventoryItemArtwork } from "@/features/inventory/components/InventoryItemArtwork";
import { getAdminTicketDefinitionPage } from "@/features/inventory/services/inventoryService";
import { withLocale } from "@/lib/routes";

type TicketPage = Awaited<ReturnType<typeof getAdminTicketDefinitionPage>>;

export async function AdminInventoryPanel({
  locale,
  page,
  query,
}: {
  locale: string;
  page: number;
  query: string;
}) {
  const ticketPage = await getAdminTicketDefinitionPage({ page, query });
  return (
    <AdminInventoryPanelContent
      locale={locale}
      query={query}
      ticketPage={ticketPage}
    />
  );
}

export function AdminInventoryPanelContent({
  locale,
  query,
  ticketPage,
}: {
  locale: string;
  query: string;
  ticketPage: TicketPage;
}) {
  const { items, page, pageSize, total } = ticketPage;
  const copy = getAdminItemCopy(locale).list;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams({ view: "items" });
    if (query) params.set("q", query);
    if (targetPage > 1) params.set("page", String(targetPage));
    return withLocale(locale, `/admin/merchants?${params.toString()}`);
  };

  return (
    <section aria-labelledby="admin-items-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-ink sm:text-2xl"
            id="admin-items-title"
          >
            {copy.title}
            <span className="ml-2 text-base font-semibold tabular-nums text-ink/60">
              {copy.countLabel(total)}
            </span>
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink/70">{copy.intro}</p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-paper transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, "/admin/items/new")}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {copy.new}
        </Link>
      </div>

      <form
        action={withLocale(locale, "/admin/merchants")}
        className="flex flex-wrap gap-2"
        method="get"
        role="search"
      >
        <input name="view" readOnly type="hidden" value="items" />
        <label className="relative min-w-0 flex-1 sm:max-w-md">
          <span className="sr-only">{copy.searchAria}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50"
          />
          <input
            className="min-h-11 w-full rounded-xl border border-sand bg-paper py-2 pl-11 pr-4 text-base text-ink outline-none placeholder:text-ink/50 focus:border-forest focus:ring-2 focus:ring-forest/20"
            defaultValue={query}
            maxLength={120}
            name="q"
            placeholder={copy.searchPlaceholder}
            type="search"
          />
        </label>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 text-sm font-semibold text-paper transition hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          type="submit"
        >
          {copy.searchButton}
        </button>
        {query ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-forest underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/admin/merchants?view=items")}
          >
            {copy.clear}
          </Link>
        ) : null}
      </form>

      {items.length ? (
        <>
          <p className="text-sm tabular-nums text-ink/70" role="status">
            {copy.resultRange(
              query,
              (page - 1) * pageSize + 1,
              Math.min(page * pageSize, total),
              total,
            )}
          </p>
          <ul className="divide-y divide-sand/50 rounded-2xl bg-paper px-4 sm:px-5">
            {items.map((definition) => {
              const remaining = definition.totalSupply - definition.issuedCount;
              return (
                <li key={definition.id}>
                  <Link
                    className="group flex min-h-24 items-center gap-4 py-3 outline-none focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    href={withLocale(locale, `/admin/items/${definition.id}`)}
                  >
                    <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-fog text-forest sm:h-20 sm:w-20">
                      {definition.imageUrl ? (
                        <InventoryItemArtwork
                          alt=""
                          className="h-full w-full"
                          imageUrl={definition.imageUrl}
                        />
                      ) : (
                        <Ticket aria-hidden="true" className="h-7 w-7" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block truncate text-base font-bold text-ink group-hover:text-forest">
                        {definition.title}
                      </span>
                      <span className="block text-xs font-semibold text-forest">
                        {copy.ticketType}
                        <span aria-hidden="true" className="mx-2 text-ink/40">
                          ·
                        </span>
                        {definition.isGiftable ? copy.giftable : copy.paused}
                      </span>
                      <span className="block text-sm tabular-nums text-ink/70">
                        {copy.remaining(remaining, definition.totalSupply)}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-ink/50 transition group-hover:text-forest"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 ? (
            <nav
              aria-label={copy.paginationAria}
              className="flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                  href={pageHref(page - 1)}
                >
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  {copy.previous}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm tabular-nums text-ink/70">
                {copy.pageNumber(page, totalPages)}
              </span>
              {page < totalPages ? (
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-forest hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                  href={pageHref(page + 1)}
                >
                  {copy.next}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-paper px-5 py-8 sm:px-6">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-fog text-forest">
            <PackageOpen aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-ink">
              {query ? copy.noResultsTitle : copy.emptyTitle}
            </h3>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              {query ? copy.noResultsHint : copy.emptyHint}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-forest underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={
              query
                ? withLocale(locale, "/admin/merchants?view=items")
                : withLocale(locale, "/admin/items/new")
            }
          >
            {query ? copy.viewAll : copy.createFirst}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
