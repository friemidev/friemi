"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  CirclePlus,
  Search,
  Ticket,
  X,
} from "lucide-react";
import type { MerchantStoreDashboardViewModel } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { withLocale } from "@/lib/routes";
import { CouponRedemptionScanner } from "./CouponRedemptionScanner";
import { getCampaignStatus, getCopy, type Campaign } from "./MerchantStoreDashboard";

type CouponFilter = "all" | "active" | "scheduled" | "ended";
const pageSize = 20;

function getFilter(campaign: Campaign): Exclude<CouponFilter, "all"> {
  if (campaign.claimAvailability === "AVAILABLE") return "active";
  if (campaign.claimAvailability === "NOT_STARTED") return "scheduled";
  return "ended";
}

export function MerchantCouponList({
  dashboard,
  locale,
}: {
  dashboard: MerchantStoreDashboardViewModel;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase(locale));
  const [filter, setFilter] = useState<CouponFilter>("all");
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLOListElement>(null);
  const counts = useMemo(
    () => ({
      all: dashboard.campaigns.length,
      active: dashboard.campaigns.filter((campaign) => getFilter(campaign) === "active").length,
      scheduled: dashboard.campaigns.filter((campaign) => getFilter(campaign) === "scheduled").length,
      ended: dashboard.campaigns.filter((campaign) => getFilter(campaign) === "ended").length,
    }),
    [dashboard.campaigns],
  );
  const filteredCampaigns = useMemo(
    () =>
      dashboard.campaigns.filter((campaign) => {
        if (filter !== "all" && getFilter(campaign) !== filter) return false;
        const searchable = `${campaign.title} ${campaign.description} ${campaign.terms ?? ""}`
          .toLocaleLowerCase(locale)
          .trim();
        return !deferredQuery || searchable.includes(deferredQuery);
      }),
    [dashboard.campaigns, deferredQuery, filter, locale],
  );
  const pageCount = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const rangeStart = filteredCampaigns.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const rangeEnd = Math.min(currentPage * pageSize, filteredCampaigns.length);

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.requestAnimationFrame(() =>
      listRef.current?.scrollIntoView({ block: "start" }),
    );
  }
  const filters: Array<{ key: CouponFilter; label: string }> = [
    { key: "all", label: copy.all },
    { key: "active", label: copy.active },
    { key: "scheduled", label: copy.scheduled },
    { key: "ended", label: copy.ended },
  ];

  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-5xl px-4 pb-28 sm:px-6 md:pb-16">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.storeBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store")}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.couponManage}</h1>
        </header>

        <p className="pt-5 text-sm font-semibold text-forest">{dashboard.merchant.name}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {copy.campaignList}
          </h2>
          <span className="text-sm tabular-nums text-ink/65">{counts.all}</span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-10">
          <aside className="min-w-0 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Link
                className="flex min-h-32 flex-col items-start justify-between rounded-2xl bg-coral p-4 text-ink transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(locale, "/profile/store/coupons/new")}
              >
                <span className="flex w-full items-start justify-between">
                  <CirclePlus aria-hidden="true" className="h-5 w-5" />
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-ink/70" />
                </span>
                <span className="text-sm font-bold sm:text-base">{copy.publish}</span>
              </Link>
              <CouponRedemptionScanner locale={locale} />
            </div>
            <dl className="grid grid-cols-3 gap-3 py-1">
              <Metric label={copy.claimed} value={dashboard.stats.claimedCount} />
              <Metric label={copy.available} value={dashboard.stats.availableCount} />
              <Metric label={copy.redeemed} value={dashboard.stats.redeemedCount} />
            </dl>
          </aside>

          <section className="min-w-0" aria-label={copy.campaignList}>
            {dashboard.campaigns.length > 3 ? (
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                <input
                  aria-label={copy.search}
                  className="h-12 w-full rounded-xl bg-fog pl-11 pr-14 text-base outline-none placeholder:text-ink/55 focus:ring-2 focus:ring-forest"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder={copy.search}
                  type="search"
                  value={query}
                />
                {query ? (
                  <button
                    aria-label={copy.clearSearch}
                    className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ink/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    onClick={() => { setQuery(""); setPage(1); }}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}

            {counts.all > 0 ? (
              <div
                aria-label={copy.coupons}
                className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
                role="group"
              >
                {filters.map((item) => (
                  <button
                    aria-pressed={filter === item.key}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${filter === item.key ? "bg-forest text-white" : "text-ink/70 hover:bg-fog"}`}
                    key={item.key}
                    onClick={() => { setFilter(item.key); setPage(1); }}
                    type="button"
                  >
                    {item.label}
                    <span className={filter === item.key ? "text-white/75" : "text-ink/70"}>
                      {counts[item.key]}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {visibleCampaigns.length ? (
              <>
                <p className="mt-3 text-xs tabular-nums text-ink/65">
                  {copy.pageSummary(rangeStart, rangeEnd, filteredCampaigns.length)}
                </p>
                <ol className="mt-3 grid scroll-mt-24 gap-2" ref={listRef}>
                {visibleCampaigns.map((campaign) => {
                  const status = getCampaignStatus(campaign, copy);
                  const remaining = campaign.quantityLimit === null
                    ? null
                    : Math.max(campaign.quantityLimit - campaign.claimedCount, 0);
                  return (
                    <li key={campaign.id}>
                      <Link
                        className="group flex min-h-28 items-center gap-4 rounded-2xl bg-fog/55 p-4 transition hover:bg-fog active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                        href={withLocale(locale, `/profile/store/coupons/${campaign.id}`)}
                      >
                        <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-paper text-forest">
                          {campaign.imageUrl ? (
                            <Image alt="" className="object-cover" fill sizes="64px" src={campaign.imageUrl} />
                          ) : (
                            <Ticket aria-hidden="true" className="h-6 w-6" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-bold leading-6">{campaign.title}</span>
                          <span className="mt-1 block text-xs text-ink/65">
                            {copy.claimed} {campaign.claimedCount}
                            {remaining === null ? "" : ` · ${copy.remaining} ${remaining}`}
                          </span>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </span>
                        <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-forest transition group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
                </ol>
                {pageCount > 1 ? (
                  <nav
                    aria-label={copy.campaignList}
                    className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                  >
                    {currentPage > 1 ? (
                      <button
                        className="min-h-11 justify-self-start text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                        onClick={() => changePage(currentPage - 1)}
                        type="button"
                      >
                        {copy.previousPage}
                      </button>
                    ) : <span />}
                    <span className="text-xs tabular-nums text-ink/70">
                      {copy.pageNumber(currentPage, pageCount)}
                    </span>
                    {currentPage < pageCount ? (
                      <button
                        className="min-h-11 justify-self-end text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                        onClick={() => changePage(currentPage + 1)}
                        type="button"
                      >
                        {copy.nextPage}
                      </button>
                    ) : <span />}
                  </nav>
                ) : null}
              </>
            ) : (
              <div className="mt-5 rounded-2xl bg-fog/70 px-5 py-9 text-center">
                <Ticket aria-hidden="true" className="mx-auto h-6 w-6 text-forest" />
                <p className="mt-3 text-sm font-medium text-ink/70">
                  {counts.all === 0 ? copy.noCampaign : copy.empty}
                </p>
                {counts.all === 0 ? (
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    href={withLocale(locale, "/profile/store/coupons/new")}
                  >
                    {copy.publish}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    className="mt-4 min-h-11 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    onClick={() => { setFilter("all"); setQuery(""); setPage(1); }}
                    type="button"
                  >
                    {copy.clearFilters}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-xl font-bold tabular-nums sm:text-2xl">{value}</dt>
      <dd className="mt-1 text-xs text-ink/70">{label}</dd>
    </div>
  );
}
