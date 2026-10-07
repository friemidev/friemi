"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
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
      clearFilters: "Effacer les filtres",
      clearSearch: "Effacer la recherche",
      copied: "Lien copié",
      copyLink: "Copier le lien",
      coupons: "Coupons",
      couponManage: "Gérer les coupons",
      campaignList: "Coupons publiés",
      couponManageHint: "Publier, partager et suivre les coupons",
      couponHelp: "Montrez le QR au client ou envoyez-lui le lien.",
      description: "Présentation",
      edit: "Modifier la boutique",
      details: "Informations de la boutique",
      detailsHint: "Nom et présentation",
      empty: "Aucun coupon ne correspond à ces filtres.",
      ended: "Terminés",
      error: "Vérifiez le nom et la présentation.",
      hideQr: "Masquer le QR",
      name: "Nom de la boutique",
      noCampaign:
        "Publiez un coupon pour suivre les réceptions et partager son QR ici.",
      publish: "Publier un coupon",
      publishHint: "Choisir le modèle et l'offre",
      qr: "Faire recevoir ce coupon",
      redeemed: "Utilisés",
      remaining: "restants",
      save: "Enregistrer",
      saved: "Boutique mise à jour",
      scheduled: "À venir",
      scheduledHint:
        "Les clients pourront le recevoir à partir de la date prévue.",
      search: "Rechercher un coupon",
      showQr: "Montrer le QR",
      statusExpired: "Expiré",
      statusNotStarted: "À venir",
      statusPublished: "En ligne",
      statusSoldOut: "Épuisé",
      statusUnlisted: "Retiré",
      title: "Gestion boutique",
      storeBack: "Boutique",
      unlist: "Retirer",
      unlistCancel: "Annuler",
      unlistConfirm: "Confirmer le retrait",
      unlistHint:
        "Plus personne ne pourra recevoir ce coupon. Ceux déjà reçus restent utilisables jusqu'à leur expiration. Cette action est définitive.",
      unlistError: "Impossible de retirer ce coupon.",
      validUntil: "Jusqu'au",
    };
  }

  if (locale === "en") {
    return {
      active: "Active",
      all: "All",
      available: "Unredeemed",
      back: "Profile",
      claimed: "Claimed",
      clearFilters: "Clear filters",
      clearSearch: "Clear search",
      copied: "Link copied",
      copyLink: "Copy link",
      coupons: "Coupons",
      couponManage: "Manage coupons",
      campaignList: "Published coupons",
      couponManageHint: "Publish, share, and track coupons",
      couponHelp: "Show customers the QR code or send them the link.",
      description: "Description",
      edit: "Edit store",
      details: "Store details",
      detailsHint: "Name and description",
      empty: "No coupons match these filters.",
      ended: "Ended",
      error: "Check the store name and description.",
      hideQr: "Hide QR",
      name: "Store name",
      noCampaign:
        "Publish a coupon to track claims and share its QR code here.",
      publish: "Publish coupon",
      publishHint: "Choose a design and enter the offer",
      qr: "Help customers claim this coupon",
      redeemed: "Redeemed",
      remaining: "remaining",
      save: "Save changes",
      saved: "Store updated",
      scheduled: "Upcoming",
      scheduledHint: "Customers can claim it when the scheduled time arrives.",
      search: "Search coupons",
      showQr: "Show claim QR",
      statusExpired: "Expired",
      statusNotStarted: "Upcoming",
      statusPublished: "Active",
      statusSoldOut: "Claimed out",
      statusUnlisted: "Unlisted",
      title: "Store management",
      storeBack: "Store",
      unlist: "Unlist",
      unlistCancel: "Cancel",
      unlistConfirm: "Confirm unlisting",
      unlistHint:
        "New customers will no longer be able to claim it. Claimed coupons can still be used until they expire. This cannot be undone.",
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
    clearFilters: "清除筛选",
    clearSearch: "清除搜索",
    copied: "链接已复制",
    copyLink: "复制领券链接",
    coupons: "优惠券",
    couponManage: "优惠券管理",
    campaignList: "已发布的券",
    couponManageHint: "发布、分享与查看领取情况",
    couponHelp: "向顾客出示二维码，或把链接发给顾客。",
    description: "门店介绍",
    edit: "编辑门店资料",
    details: "门店资料",
    detailsHint: "名称与介绍",
    empty: "没有符合条件的优惠券。",
    ended: "已结束",
    error: "请检查门店名称和介绍。",
    hideQr: "收起二维码",
    name: "店铺名称",
    noCampaign: "发布后，可在这里查看领取情况并分享领券码。",
    publish: "发布优惠券",
    publishHint: "选券面、填写活动内容",
    qr: "让顾客领取这张券",
    redeemed: "已核销",
    remaining: "剩余",
    save: "保存资料",
    saved: "门店资料已更新",
    scheduled: "未开始",
    scheduledHint: "顾客需等到开始时间才能领取。",
    search: "搜索优惠券",
    showQr: "出示领券码",
    statusExpired: "已过期",
    statusNotStarted: "未开始",
    statusPublished: "上架中",
    statusSoldOut: "已领完",
    statusUnlisted: "已下架",
    title: "门店管理",
    storeBack: "门店管理",
    unlist: "下架",
    unlistCancel: "取消",
    unlistConfirm: "确认下架",
    unlistHint:
      "下架后无法再领取；已领取的券在有效期内仍可使用。此操作无法撤销。",
    unlistError: "下架失败，请重试。",
    validUntil: "截止",
  };
}

function getFilter(
  campaign: Campaign,
  locallyUnlisted: boolean,
): Exclude<CouponFilter, "all"> {
  if (locallyUnlisted) return "ended";
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
  const [confirmUnlistId, setConfirmUnlistId] = useState<string | null>(null);
  const [locallyUnlistedIds, setLocallyUnlistedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [unlistState, unlistAction, unlistPending] = useActionState(
    unlistCouponCampaignAction,
    initialUnlistState,
  );

  useEffect(() => {
    if (unlistState.status !== "UNLISTED" || !unlistState.couponId) return;
    const couponId = unlistState.couponId;
    setLocallyUnlistedIds((current) => {
      if (current.has(couponId)) return current;
      return new Set([...current, couponId]);
    });
  }, [unlistState.couponId, unlistState.status]);

  const counts = useMemo(
    () => ({
      active: dashboard.campaigns.filter(
        (campaign) =>
          getFilter(campaign, locallyUnlistedIds.has(campaign.id)) === "active",
      ).length,
      all: dashboard.campaigns.length,
      ended: dashboard.campaigns.filter(
        (campaign) =>
          getFilter(campaign, locallyUnlistedIds.has(campaign.id)) === "ended",
      ).length,
      scheduled: dashboard.campaigns.filter(
        (campaign) =>
          getFilter(campaign, locallyUnlistedIds.has(campaign.id)) ===
          "scheduled",
      ).length,
    }),
    [dashboard.campaigns, locallyUnlistedIds],
  );

  const visibleCampaigns = useMemo(
    () =>
      dashboard.campaigns.filter((campaign) => {
        const matchesFilter =
          filter === "all" ||
          getFilter(campaign, locallyUnlistedIds.has(campaign.id)) === filter;
        const searchable =
          `${campaign.title} ${campaign.description} ${campaign.terms ?? ""}`
            .toLocaleLowerCase(locale)
            .trim();
        return (
          matchesFilter &&
          (!deferredQuery || searchable.includes(deferredQuery))
        );
      }),
    [dashboard.campaigns, deferredQuery, filter, locale, locallyUnlistedIds],
  );

  const filters: Array<{ key: CouponFilter; label: string }> = [
    { key: "all", label: copy.all },
    { key: "active", label: copy.active },
    { key: "scheduled", label: copy.scheduled },
    { key: "ended", label: copy.ended },
  ];

  return (
    <main className="app-mobile-page-shell min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.storeBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.couponManage}</h1>
        </header>

        <p className="pt-2 text-sm text-ink/65">{dashboard.merchant.name}</p>
        <div className="grid gap-7 pt-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:gap-10">
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Link
                className="flex min-h-32 flex-col items-start justify-between rounded-[1.25rem] bg-coral p-4 text-left text-ink transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(locale, "/profile/store/coupons/new")}
              >
                <span className="flex w-full items-start justify-between">
                  <CirclePlus className="h-5 w-5" />
                  <ArrowUpRight className="h-4 w-4 text-ink/70" />
                </span>
                <span className="text-base font-bold">{copy.publish}</span>
                <span className="text-xs leading-5 text-ink/75">
                  {copy.publishHint}
                </span>
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
              {copy.campaignList}
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
                const wasUnlisted = locallyUnlistedIds.has(campaign.id);
                const status = wasUnlisted
                  ? {
                      className: "bg-fog text-ink/70",
                      label: copy.statusUnlisted,
                    }
                  : getCampaignStatus(campaign, copy);
                const isPublished =
                  campaign.campaignStatus === "PUBLISHED" && !wasUnlisted;
                const canShowQr =
                  !wasUnlisted &&
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
                      {isPublished && confirmUnlistId !== campaign.id ? (
                        <button
                          className="min-h-11 text-sm font-semibold text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                          onClick={() => setConfirmUnlistId(campaign.id)}
                          type="button"
                        >
                          {copy.unlist}
                        </button>
                      ) : null}
                    </div>
                    {isPublished && confirmUnlistId === campaign.id ? (
                      <div className="mt-2 rounded-xl bg-fog p-4">
                        <p className="text-sm leading-6 text-ink/80">
                          {copy.unlistHint}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <form action={unlistAction}>
                            <input
                              name="couponId"
                              type="hidden"
                              value={campaign.id}
                            />
                            <input name="locale" type="hidden" value={locale} />
                            <button
                              className="min-h-11 rounded-full bg-danger px-4 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                              disabled={unlistPending}
                              type="submit"
                            >
                              {copy.unlistConfirm}
                            </button>
                          </form>
                          <button
                            className="min-h-11 rounded-full px-4 text-sm font-semibold text-ink/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                            onClick={() => setConfirmUnlistId(null)}
                            type="button"
                          >
                            {copy.unlistCancel}
                          </button>
                        </div>
                      </div>
                    ) : null}
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
                    {qrOpen && canShowQr && path ? (
                      <div className="mt-3 rounded-[1.25rem] bg-fog px-4 py-5">
                        <p className="mb-3 text-center text-sm font-semibold text-forest">
                          {copy.qr}
                        </p>
                        <p className="mb-4 text-center text-sm text-ink/75">
                          {campaign.claimAvailability === "NOT_STARTED"
                            ? copy.scheduledHint
                            : copy.couponHelp}
                        </p>
                        <CouponQrCode
                          copiedLabel={copy.copied}
                          copyLabel={copy.copyLink}
                          path={path}
                        />
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
                ) : (
                  <button
                    className="mt-4 min-h-11 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                    type="button"
                  >
                    {copy.clearFilters}
                  </button>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

export function MerchantStoreHome({
  dashboard,
  locale,
}: {
  dashboard: MerchantStoreDashboardViewModel;
  locale: string;
}) {
  const copy = getCopy(locale);

  return (
    <main className="app-mobile-page-shell min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
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

        <section className="pb-7 pt-5" aria-label={dashboard.merchant.name}>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-fog text-forest">
              {dashboard.merchant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={dashboard.merchant.logoUrl}
                />
              ) : (
                <Store className="h-7 w-7" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold leading-tight">
                {dashboard.merchant.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/65">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{dashboard.merchant.city}</span>
              </p>
            </div>
          </div>
          {dashboard.merchant.description ? (
            <p className="mt-5 line-clamp-3 text-sm leading-6 text-ink/75">
              {dashboard.merchant.description}
            </p>
          ) : null}
        </section>

        <nav
          className="divide-y divide-sand/50 border-t border-sand/50"
          aria-label={copy.title}
        >
          <Link
            className="flex min-h-20 items-center gap-4 py-4 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store/coupons")}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coral/40 text-forest">
              <Ticket className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">
                {copy.couponManage}
              </span>
              <span className="mt-0.5 block text-sm text-ink/65">
                {copy.couponManageHint}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink/45" />
          </Link>
          <Link
            className="flex min-h-20 items-center gap-4 py-4 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store/details")}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fog text-forest">
              <PencilLine className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">{copy.details}</span>
              <span className="mt-0.5 block text-sm text-ink/65">
                {copy.detailsHint}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink/45" />
          </Link>
        </nav>
      </div>
    </main>
  );
}

export function MerchantStoreDetails({
  dashboard,
  locale,
}: {
  dashboard: MerchantStoreDashboardViewModel;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [storeState, storeAction, storePending] = useActionState(
    updateMerchantStoreAction,
    initialUpdateState,
  );

  return (
    <main className="app-mobile-page-shell min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-2xl px-4 pb-12 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.storeBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.details}</h1>
        </header>
        <form action={storeAction} className="grid gap-5 pt-6">
          <input name="locale" type="hidden" value={locale} />
          <Field label={copy.name}>
            <input
              className="h-12 rounded-xl bg-fog px-4 text-base font-medium outline-none focus:ring-2 focus:ring-forest"
              defaultValue={dashboard.merchant.name}
              maxLength={80}
              name="name"
              required
            />
          </Field>
          <Field label={copy.description}>
            <textarea
              className="min-h-40 resize-y rounded-xl bg-fog px-4 py-3 text-base leading-6 outline-none focus:ring-2 focus:ring-forest"
              defaultValue={dashboard.merchant.description}
              maxLength={1200}
              name="description"
              required
            />
          </Field>
          {storeState.success ? (
            <p className="text-sm font-semibold text-forest" role="status">
              {copy.saved}
            </p>
          ) : null}
          {storeState.error ? (
            <p className="text-sm font-semibold text-danger" role="alert">
              {copy.error}
            </p>
          ) : null}
          <button
            className="min-h-12 rounded-full bg-forest px-5 text-sm font-bold text-white disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            disabled={storePending}
            type="submit"
          >
            {copy.save}
          </button>
        </form>
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
