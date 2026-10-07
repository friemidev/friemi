"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  CirclePlus,
  MapPin,
  PencilLine,
  QrCode,
  Search,
  Store,
  Ticket,
  X,
} from "lucide-react";
import {
  unlistCouponCampaignAction,
  updateMerchantStoreAction,
  type UnlistCouponCampaignState,
  type UpdateMerchantStoreState,
} from "@/features/coupons/actions/couponActions";
import type { MerchantStoreDashboardViewModel } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { withLocale } from "@/lib/routes";
import { CouponQrCode } from "./CouponQrCode";
import { CouponRedemptionScanner } from "./CouponRedemptionScanner";

const initialUpdateState: UpdateMerchantStoreState = {};
const initialUnlistState: UnlistCouponCampaignState = {};

type CouponFilter = "all" | "active" | "scheduled" | "ended";
type Campaign = MerchantStoreDashboardViewModel["campaigns"][number];

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      active: "En ligne",
      all: "Tous",
      available: "À utiliser",
      back: "Profil",
      claimed: "Reçus",
      clearSearch: "Effacer la recherche",
      copied: "Lien copié",
      copyLink: "Copier le lien",
      coupons: "Coupons",
      description: "Présentation",
      edit: "Modifier la boutique",
      empty: "Aucun coupon ne correspond à ces filtres.",
      ended: "Terminés",
      error: "Vérifiez le nom et la présentation.",
      fixedQr: "Ce QR reste valable pendant toute la campagne.",
      hideQr: "Masquer le QR",
      name: "Nom de la boutique",
      noCampaign: "Aucun coupon publié pour le moment.",
      publish: "Publier un coupon",
      qr: "QR de réception",
      redeemed: "Utilisés",
      remaining: "restants",
      save: "Enregistrer",
      saved: "Boutique mise à jour",
      scheduled: "À venir",
      search: "Rechercher un coupon",
      showQr: "Voir le QR",
      statusExpired: "Expiré",
      statusNotStarted: "À venir",
      statusPublished: "En ligne",
      statusSoldOut: "Épuisé",
      statusUnlisted: "Retiré",
      title: "Gestion boutique",
      unlist: "Retirer",
      unlistError: "Impossible de retirer ce coupon.",
      validUntil: "Jusqu'au",
    };
  }

  if (locale === "en") {
    return {
      active: "Active",
      all: "All",
      available: "Available",
      back: "Profile",
      claimed: "Claimed",
      clearSearch: "Clear search",
      copied: "Link copied",
      copyLink: "Copy link",
      coupons: "Coupons",
      description: "Description",
      edit: "Edit store",
      empty: "No coupons match these filters.",
      ended: "Ended",
      error: "Check the store name and description.",
      fixedQr: "This QR stays valid for the entire campaign.",
      hideQr: "Hide QR",
      name: "Store name",
      noCampaign: "No coupons published yet.",
      publish: "Publish coupon",
      qr: "Claim QR",
      redeemed: "Redeemed",
      remaining: "remaining",
      save: "Save changes",
      saved: "Store updated",
      scheduled: "Upcoming",
      search: "Search coupons",
      showQr: "View QR",
      statusExpired: "Expired",
      statusNotStarted: "Upcoming",
      statusPublished: "Active",
      statusSoldOut: "Claimed out",
      statusUnlisted: "Unlisted",
      title: "Store management",
      unlist: "Unlist",
      unlistError: "Could not unlist this coupon.",
      validUntil: "Until",
    };
  }

  return {
    active: "上架中",
    all: "全部",
    available: "待使用",
    back: "个人主页",
    claimed: "已领取",
    clearSearch: "清除搜索",
    copied: "链接已复制",
    copyLink: "复制领券链接",
    coupons: "优惠券",
    description: "门店介绍",
    edit: "编辑门店资料",
    empty: "没有符合条件的优惠券。",
    ended: "已结束",
    error: "请检查门店名称和介绍。",
    fixedQr: "同一期优惠券共用此二维码。",
    hideQr: "收起二维码",
    name: "店铺名称",
    noCampaign: "还没有发布优惠券。",
    publish: "发布优惠券",
    qr: "领券二维码",
    redeemed: "已核销",
    remaining: "剩余",
    save: "保存资料",
    saved: "门店资料已更新",
    scheduled: "未开始",
    search: "搜索优惠券",
    showQr: "查看二维码",
    statusExpired: "已过期",
    statusNotStarted: "未开始",
    statusPublished: "上架中",
    statusSoldOut: "已领完",
    statusUnlisted: "已下架",
    title: "门店管理",
    unlist: "下架",
    unlistError: "下架失败，请重试。",
    validUntil: "截止",
  };
}

function getFilter(campaign: Campaign): Exclude<CouponFilter, "all"> {
  if (campaign.claimAvailability === "AVAILABLE") return "active";
  if (campaign.claimAvailability === "NOT_STARTED") return "scheduled";
  return "ended";
}

export function MerchantStoreDashboard({
  dashboard,
  locale,
}: {
  dashboard: MerchantStoreDashboardViewModel;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(
    query.trim().toLocaleLowerCase(locale),
  );
  const [filter, setFilter] = useState<CouponFilter>("all");
  const [openQrId, setOpenQrId] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState(false);
  const [storeState, storeAction, storePending] = useActionState(
    updateMerchantStoreAction,
    initialUpdateState,
  );
  const [unlistState, unlistAction, unlistPending] = useActionState(
    unlistCouponCampaignAction,
    initialUnlistState,
  );

  const counts = useMemo(
    () => ({
      active: dashboard.campaigns.filter(
        (campaign) => getFilter(campaign) === "active",
      ).length,
      all: dashboard.campaigns.length,
      ended: dashboard.campaigns.filter(
        (campaign) => getFilter(campaign) === "ended",
      ).length,
      scheduled: dashboard.campaigns.filter(
        (campaign) => getFilter(campaign) === "scheduled",
      ).length,
    }),
    [dashboard.campaigns],
  );

  const visibleCampaigns = useMemo(
    () =>
      dashboard.campaigns.filter((campaign) => {
        const matchesFilter =
          filter === "all" || getFilter(campaign) === filter;
        const searchable =
          `${campaign.title} ${campaign.description} ${campaign.terms ?? ""}`
            .toLocaleLowerCase(locale)
            .trim();
        return (
          matchesFilter &&
          (!deferredQuery || searchable.includes(deferredQuery))
        );
      }),
    [dashboard.campaigns, deferredQuery, filter, locale],
  );

  const filters: Array<{ key: CouponFilter; label: string }> = [
    { key: "all", label: copy.all },
    { key: "active", label: copy.active },
    { key: "scheduled", label: copy.scheduled },
    { key: "ended", label: copy.ended },
  ];

  return (
    <main className="app-mobile-page-shell min-h-svh bg-paper text-ink">
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.back}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.title}</h1>
        </header>

        <div className="grid gap-7 pt-2 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-10 lg:pt-6">
          <div className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-[1.375rem] bg-forest p-5 text-white sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-paper text-forest">
                  {dashboard.merchant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={dashboard.merchant.logoUrl}
                    />
                  ) : (
                    <Store className="h-6 w-6" />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="break-words text-xl font-bold leading-tight">
                    {dashboard.merchant.name}
                  </h2>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-white/75">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{dashboard.merchant.city}</span>
                  </p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/80">
                {dashboard.merchant.description}
              </p>
              <button
                aria-expanded={editingStore}
                className="mt-5 flex min-h-11 w-full items-center justify-between border-t border-white/20 pt-3 text-left text-sm font-semibold transition hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={() => setEditingStore((value) => !value)}
                type="button"
              >
                {copy.edit}
                <PencilLine className="h-4 w-4" />
              </button>
            </section>

            {editingStore ? (
              <section className="rounded-[1.25rem] bg-fog p-5">
                <form action={storeAction} className="grid gap-4">
                  <input name="locale" type="hidden" value={locale} />
                  <Field label={copy.name}>
                    <input
                      className="h-12 rounded-xl bg-paper px-4 text-base font-medium outline-none focus:ring-2 focus:ring-forest"
                      defaultValue={dashboard.merchant.name}
                      maxLength={80}
                      name="name"
                      required
                    />
                  </Field>
                  <Field label={copy.description}>
                    <textarea
                      className="min-h-28 resize-y rounded-xl bg-paper px-4 py-3 text-base leading-6 outline-none focus:ring-2 focus:ring-forest"
                      defaultValue={dashboard.merchant.description}
                      maxLength={1200}
                      name="description"
                      required
                    />
                  </Field>
                  {storeState.success ? (
                    <p
                      className="text-sm font-semibold text-forest"
                      role="status"
                    >
                      {copy.saved}
                    </p>
                  ) : null}
                  {storeState.error ? (
                    <p
                      className="text-sm font-semibold text-danger"
                      role="alert"
                    >
                      {copy.error}
                    </p>
                  ) : null}
                  <button
                    className="h-11 rounded-full bg-forest px-5 text-sm font-bold text-white disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    disabled={storePending}
                    type="submit"
                  >
                    {copy.save}
                  </button>
                </form>
              </section>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Link
                className="flex min-h-28 flex-col items-start justify-between rounded-[1.25rem] bg-coral p-4 text-left text-ink transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(locale, "/profile/store/coupons/new")}
              >
                <span className="flex w-full items-start justify-between">
                  <CirclePlus className="h-5 w-5" />
                  <ArrowUpRight className="h-4 w-4 text-ink/70" />
                </span>
                <span className="text-base font-bold">{copy.publish}</span>
              </Link>
              <CouponRedemptionScanner locale={locale} />
            </div>

            <div
              className="grid grid-cols-3 gap-3 py-2"
              aria-label={copy.coupons}
            >
              <StoreMetric
                label={copy.claimed}
                value={dashboard.stats.claimedCount}
              />
              <StoreMetric
                label={copy.available}
                value={dashboard.stats.availableCount}
              />
              <StoreMetric
                label={copy.redeemed}
                value={dashboard.stats.redeemedCount}
              />
            </div>
          </div>

          <section
            className="min-w-0"
            aria-labelledby="merchant-coupons-heading"
          >
            <h2
              id="merchant-coupons-heading"
              className="flex items-baseline gap-2 text-xl font-bold"
            >
              {copy.coupons}
              <span className="text-sm font-medium tabular-nums text-ink/70">
                {counts.all}
              </span>
            </h2>

            {dashboard.campaigns.length > 3 ? (
              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                <input
                  aria-label={copy.search}
                  className="h-12 w-full rounded-xl bg-fog pl-11 pr-14 text-base outline-none placeholder:text-ink/55 focus:ring-2 focus:ring-forest"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  type="search"
                  value={query}
                />
                {query ? (
                  <button
                    aria-label={copy.clearSearch}
                    className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-ink/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    onClick={() => setQuery("")}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}

            {counts.all > 0 ? (
              <div
                aria-label={copy.coupons}
                className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
                role="group"
              >
                {filters.map((item) => {
                  const selected = filter === item.key;
                  return (
                    <button
                      aria-pressed={selected}
                      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${selected ? "bg-forest text-white" : "text-ink/70 hover:bg-fog"}`}
                      key={item.key}
                      onClick={() => setFilter(item.key)}
                      type="button"
                    >
                      {item.label}
                      <span
                        className={selected ? "text-white/75" : "text-ink/70"}
                      >
                        {counts[item.key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-3 divide-y divide-sand/40">
              {visibleCampaigns.map((campaign) => {
                const status = getCampaignStatus(campaign, copy);
                const isPublished = campaign.campaignStatus === "PUBLISHED";
                const canShowQr =
                  (campaign.claimAvailability === "AVAILABLE" ||
                    campaign.claimAvailability === "NOT_STARTED") &&
                  Boolean(campaign.claimToken);
                const path = campaign.claimToken
                  ? withLocale(locale, `/coupons/claim/${campaign.claimToken}`)
                  : null;
                const qrOpen = openQrId === campaign.id;
                const remaining =
                  campaign.quantityLimit === null
                    ? null
                    : Math.max(
                        campaign.quantityLimit - campaign.claimedCount,
                        0,
                      );

                return (
                  <article className="py-5 first:pt-2" key={campaign.id}>
                    <div className="flex min-w-0 gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-fog">
                        {campaign.imageUrl ? (
                          <Image
                            alt=""
                            className="h-full w-full object-cover"
                            fill
                            sizes="80px"
                            src={campaign.imageUrl}
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-forest">
                            <Ticket className="h-6 w-6" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                          <h3 className="min-w-0 flex-1 text-sm font-bold leading-5">
                            {campaign.title}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-ink/70">
                          {copy.claimed} {campaign.claimedCount}
                          {remaining === null
                            ? ""
                            : ` · ${copy.remaining} ${remaining}`}
                        </p>
                        {campaign.expiresAt ? (
                          <p className="mt-0.5 text-xs leading-5 text-ink/70">
                            {copy.validUntil}{" "}
                            {formatDate(locale, campaign.expiresAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 flex min-h-11 items-center justify-between gap-4 pl-24">
                      {canShowQr && path ? (
                        <button
                          aria-expanded={qrOpen}
                          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                          onClick={() =>
                            setOpenQrId((current) =>
                              current === campaign.id ? null : campaign.id,
                            )
                          }
                          type="button"
                        >
                          <QrCode className="h-4 w-4" />
                          {qrOpen ? copy.hideQr : copy.showQr}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${qrOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      ) : (
                        <span />
                      )}
                      {isPublished ? (
                        <form action={unlistAction}>
                          <input
                            name="couponId"
                            type="hidden"
                            value={campaign.id}
                          />
                          <input name="locale" type="hidden" value={locale} />
                          <button
                            className="min-h-11 text-sm font-semibold text-danger disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                            disabled={unlistPending}
                            type="submit"
                          >
                            {copy.unlist}
                          </button>
                        </form>
                      ) : null}
                    </div>
                    {unlistState.couponId === campaign.id &&
                    unlistState.status === "UNLISTED" ? (
                      <p
                        className="pl-24 text-xs font-semibold text-forest"
                        role="status"
                      >
                        {copy.statusUnlisted}
                      </p>
                    ) : null}
                    {unlistState.couponId === campaign.id &&
                    unlistState.status !== "UNLISTED" ? (
                      <p
                        className="pl-24 text-xs font-semibold text-danger"
                        role="alert"
                      >
                        {copy.unlistError}
                      </p>
                    ) : null}
                    {qrOpen && path ? (
                      <div className="mt-3 rounded-[1.25rem] bg-fog px-4 py-5">
                        <p className="mb-3 text-center text-sm font-semibold text-forest">
                          {copy.qr}
                        </p>
                        <CouponQrCode
                          copiedLabel={copy.copied}
                          copyLabel={copy.copyLink}
                          path={path}
                        />
                        <p className="mt-3 text-center text-xs text-ink/70">
                          {copy.fixedQr}
                        </p>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {visibleCampaigns.length === 0 ? (
              <div className="rounded-[1.25rem] bg-fog px-5 py-10 text-center">
                <Ticket className="mx-auto h-6 w-6 text-forest" />
                <p className="mt-3 text-sm font-medium text-ink/70">
                  {counts.all === 0 ? copy.noCampaign : copy.empty}
                </p>
                {counts.all === 0 ? (
                  <Link
                    className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    href={withLocale(locale, "/profile/store/coupons/new")}
                  >
                    {copy.publish}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function getCampaignStatus(
  campaign: Campaign,
  copy: ReturnType<typeof getCopy>,
) {
  if (campaign.claimAvailability === "EXPIRED")
    return { className: "bg-fog text-ink/70", label: copy.statusExpired };
  if (campaign.claimAvailability === "NOT_STARTED")
    return { className: "bg-ice/60 text-forest", label: copy.statusNotStarted };
  if (campaign.claimAvailability === "SOLD_OUT")
    return { className: "bg-rose/30 text-danger", label: copy.statusSoldOut };
  if (campaign.claimAvailability === "AVAILABLE")
    return { className: "bg-fog text-forest", label: copy.statusPublished };
  return { className: "bg-fog text-ink/70", label: copy.statusUnlisted };
}

function formatDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink/75">
      {label}
      {children}
    </label>
  );
}

function StoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink/70">{label}</p>
    </div>
  );
}
