"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  CirclePlus,
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
      available: "Disponibles",
      back: "Profil",
      claimed: "Reçus",
      clearSearch: "Effacer la recherche",
      copied: "Lien copié",
      copyLink: "Copier le lien",
      countSuffix: "coupons",
      coupons: "Mes coupons",
      description: "Présentation",
      edit: "Modifier la boutique",
      empty: "Aucun coupon ne correspond à ces filtres.",
      ended: "Terminés",
      error: "Vérifiez le nom et la présentation.",
      fixedQr: "Ce QR peut être partagé pendant toute la campagne.",
      hideQr: "Masquer le QR",
      name: "Nom de la boutique",
      noCampaign: "Aucun coupon publié.",
      publish: "Publier un coupon",
      qr: "QR de réception",
      redeemed: "Utilisés",
      remaining: "restants",
      save: "Enregistrer",
      saved: "Boutique mise à jour",
      scheduled: "À venir",
      search: "Rechercher un coupon",
      showQr: "Afficher le QR",
      statusExpired: "Expiré",
      statusNotStarted: "À venir",
      statusPublished: "En ligne",
      statusSoldOut: "Épuisé",
      statusUnlisted: "Retiré",
      title: "Boutique",
      unlist: "Retirer",
      validUntil: "Valable jusqu'au",
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
      countSuffix: "coupons",
      coupons: "My coupons",
      description: "Description",
      edit: "Edit store",
      empty: "No coupons match these filters.",
      ended: "Ended",
      error: "Check the store name and description.",
      fixedQr: "Share this QR throughout the campaign.",
      hideQr: "Hide QR",
      name: "Store name",
      noCampaign: "No coupon campaigns yet.",
      publish: "Publish coupon",
      qr: "Claim QR",
      redeemed: "Redeemed",
      remaining: "remaining",
      save: "Save",
      saved: "Store updated",
      scheduled: "Upcoming",
      search: "Search coupons",
      showQr: "Show QR",
      statusExpired: "Expired",
      statusNotStarted: "Upcoming",
      statusPublished: "Published",
      statusSoldOut: "Claimed out",
      statusUnlisted: "Unlisted",
      title: "Store",
      unlist: "Unlist",
      validUntil: "Valid until",
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
    countSuffix: "张优惠券",
    coupons: "我的优惠券",
    description: "门店介绍",
    edit: "编辑门店资料",
    empty: "没有符合当前条件的优惠券。",
    ended: "已结束",
    error: "请检查门店名称和介绍。",
    fixedQr: "同一期优惠券共用此二维码，可在线上或线下持续展示。",
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
    showQr: "展开二维码",
    statusExpired: "已过期",
    statusNotStarted: "未开始",
    statusPublished: "上架中",
    statusSoldOut: "已领完",
    statusUnlisted: "已下架",
    title: "门店",
    unlist: "下架",
    validUntil: "有效期至",
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

  const visibleCampaigns = useMemo(() => {
    return dashboard.campaigns.filter((campaign) => {
      const matchesFilter = filter === "all" || getFilter(campaign) === filter;
      const searchable =
        `${campaign.title} ${campaign.description} ${campaign.terms ?? ""}`
          .toLocaleLowerCase(locale)
          .trim();
      return (
        matchesFilter && (!deferredQuery || searchable.includes(deferredQuery))
      );
    });
  }, [dashboard.campaigns, deferredQuery, filter, locale]);

  const filters: Array<{ key: CouponFilter; label: string }> = [
    { key: "all", label: copy.all },
    { key: "active", label: copy.active },
    { key: "scheduled", label: copy.scheduled },
    { key: "ended", label: copy.ended },
  ];

  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#F7F8F4] pb-12">
      <header className="flex items-center justify-between bg-white px-5 pb-4 pt-5">
        <Link
          aria-label={copy.back}
          className="grid h-10 w-10 place-items-center rounded-full text-[#123D31] ring-1 ring-[#D6D5B2] transition active:scale-95"
          href={withLocale(locale, "/profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-[#111210]">{copy.title}</h1>
        <button
          aria-expanded={editingStore}
          aria-label={copy.edit}
          className={`grid h-10 w-10 place-items-center rounded-full transition active:scale-95 ${
            editingStore
              ? "bg-[#156240] text-white"
              : "bg-[#EAF5E8] text-[#156240]"
          }`}
          onClick={() => setEditingStore((value) => !value)}
          type="button"
        >
          <PencilLine className="h-4.5 w-4.5" />
        </button>
      </header>

      <section className="bg-white px-5 pb-6 pt-2">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EAF5E8] text-[#156240] ring-1 ring-[#D6D5B2]">
            {dashboard.merchant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={dashboard.merchant.logoUrl}
              />
            ) : (
              <Store className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase text-[#6C746A]">
              Friemi Partner
            </p>
            <h2 className="mt-1 break-words text-2xl font-black leading-tight text-[#111210]">
              {dashboard.merchant.name}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-[#6C746A]">
              {dashboard.merchant.description}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-[#EFEAD7] border-y border-[#EFEAD7] py-4 text-center">
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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-full bg-[#156240] px-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(21,98,64,0.18)] transition active:scale-[0.98]"
            href={withLocale(locale, "/profile/store/coupons/new")}
          >
            <CirclePlus className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{copy.publish}</span>
          </Link>
          <CouponRedemptionScanner locale={locale} />
        </div>
      </section>

      {editingStore ? (
        <section className="border-t border-[#EFEAD7] bg-white px-5 pb-6 pt-5">
          <form action={storeAction} className="grid gap-4">
            <input name="locale" type="hidden" value={locale} />
            <Field label={copy.name}>
              <input
                className="h-12 rounded-lg bg-[#F7F8F4] px-4 text-sm font-bold outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                defaultValue={dashboard.merchant.name}
                maxLength={80}
                name="name"
                required
              />
            </Field>
            <Field label={copy.description}>
              <textarea
                className="min-h-24 resize-y rounded-lg bg-[#F7F8F4] px-4 py-3 text-sm font-semibold leading-6 outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
                defaultValue={dashboard.merchant.description}
                maxLength={1200}
                name="description"
                required
              />
            </Field>
            {storeState.success ? (
              <p className="text-sm font-bold text-[#156240]">{copy.saved}</p>
            ) : null}
            {storeState.error ? (
              <p className="text-sm font-bold text-[#A62834]">{copy.error}</p>
            ) : null}
            <button
              className="h-11 rounded-full bg-[#111210] px-5 text-sm font-black text-white disabled:opacity-55"
              disabled={storePending}
              type="submit"
            >
              {copy.save}
            </button>
          </form>
        </section>
      ) : null}

      <section className="px-4 py-6 sm:px-5">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] font-black uppercase text-[#6C746A]">
              {counts.all} {copy.countSuffix}
            </p>
            <h2 className="mt-1 text-xl font-black text-[#111210]">
              {copy.coupons}
            </h2>
          </div>
          <Ticket className="mb-1 h-5 w-5 text-[#156240]" />
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A8276]" />
          <input
            aria-label={copy.search}
            className="h-12 w-full rounded-full bg-white pl-11 pr-11 text-sm font-semibold outline-none ring-1 ring-[#E3E1D3] placeholder:text-[#989D95] focus:ring-2 focus:ring-[#8AB68E]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label={copy.clearSearch}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[#6C746A]"
              onClick={() => setQuery("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div
          aria-label={copy.coupons}
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-5 sm:px-5"
          role="tablist"
        >
          {filters.map((item) => {
            const selected = filter === item.key;
            return (
              <button
                aria-selected={selected}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black ring-1 transition active:scale-95 ${
                  selected
                    ? "bg-[#156240] text-white ring-[#156240]"
                    : "bg-white text-[#4F574F] ring-[#E3E1D3]"
                }`}
                key={item.key}
                onClick={() => setFilter(item.key)}
                role="tab"
                type="button"
              >
                {item.label}
                <span className={selected ? "text-white/75" : "text-[#8A9087]"}>
                  {counts[item.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3">
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
                : Math.max(campaign.quantityLimit - campaign.claimedCount, 0);
            const progress = campaign.quantityLimit
              ? Math.min(
                  Math.round(
                    (campaign.claimedCount / campaign.quantityLimit) * 100,
                  ),
                  100,
                )
              : 0;

            return (
              <article
                className="overflow-hidden rounded-lg bg-white ring-1 ring-[#E3E1D3]"
                key={campaign.id}
              >
                <div className="flex gap-3 p-3">
                  <div className="relative h-[5.75rem] w-[5.75rem] shrink-0 overflow-hidden rounded-md bg-[#EEF1EA]">
                    {campaign.imageUrl ? (
                      <Image
                        alt={campaign.title}
                        className="h-full w-full object-cover"
                        fill
                        sizes="92px"
                        src={campaign.imageUrl}
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[#156240]">
                        <Ticket className="h-6 w-6" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 min-w-0 text-sm font-black leading-5 text-[#111210]">
                        {campaign.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-[1.125rem] text-[#6C746A]">
                      {campaign.description}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-[#4F574F]">
                      {copy.claimed} {campaign.claimedCount}
                      {remaining === null
                        ? ""
                        : ` · ${copy.remaining} ${remaining}`}
                    </p>
                    {campaign.quantityLimit ? (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#ECEDE5]">
                        <div
                          className="h-full rounded-full bg-[#2F9C62] transition-[width]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {campaign.expiresAt ? (
                  <p className="border-t border-[#F0EEE3] px-3 py-2 text-[11px] font-semibold text-[#7A8276]">
                    {copy.validUntil} · {formatDate(locale, campaign.expiresAt)}
                  </p>
                ) : null}

                <div className="flex min-h-11 items-center border-t border-[#F0EEE3] px-2">
                  {canShowQr && path ? (
                    <button
                      aria-expanded={qrOpen}
                      className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 text-xs font-black text-[#156240]"
                      onClick={() =>
                        setOpenQrId((current) =>
                          current === campaign.id ? null : campaign.id,
                        )
                      }
                      type="button"
                    >
                      <QrCode className="h-4 w-4 shrink-0" />
                      {qrOpen ? copy.hideQr : copy.showQr}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          qrOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    <span className="flex-1" />
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
                        className="h-9 px-3 text-xs font-black text-[#A62834] disabled:opacity-50"
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
                  <p className="border-t border-[#F0EEE3] px-4 py-2 text-center text-xs font-bold text-[#156240]">
                    {copy.statusUnlisted}
                  </p>
                ) : null}

                {qrOpen && path ? (
                  <div className="border-t border-[#F0EEE3] bg-[#FBFCF8] px-4 py-5">
                    <p className="mb-3 text-center text-xs font-black text-[#123D31]">
                      {copy.qr}
                    </p>
                    <CouponQrCode
                      copiedLabel={copy.copied}
                      copyLabel={copy.copyLink}
                      path={path}
                    />
                    <p className="mx-auto mt-3 max-w-[17rem] text-center text-[11px] font-semibold leading-5 text-[#6C746A]">
                      {copy.fixedQr}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}

          {visibleCampaigns.length === 0 ? (
            <div className="grid min-h-44 place-items-center rounded-lg border border-dashed border-[#D6D5B2] bg-white px-6 text-center">
              <div>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
                  <Ticket className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-black text-[#4F574F]">
                  {dashboard.campaigns.length === 0
                    ? copy.noCampaign
                    : copy.empty}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function getCampaignStatus(
  campaign: Campaign,
  copy: ReturnType<typeof getCopy>,
) {
  if (campaign.claimAvailability === "EXPIRED") {
    return {
      className: "bg-[#F1F1EE] text-[#6C746A]",
      label: copy.statusExpired,
    };
  }
  if (campaign.claimAvailability === "NOT_STARTED") {
    return {
      className: "bg-[#EEF4F7] text-[#31596B]",
      label: copy.statusNotStarted,
    };
  }
  if (campaign.claimAvailability === "SOLD_OUT") {
    return {
      className: "bg-[#FFF0EC] text-[#A04A3B]",
      label: copy.statusSoldOut,
    };
  }
  if (campaign.claimAvailability === "AVAILABLE") {
    return {
      className: "bg-[#EAF5E8] text-[#156240]",
      label: copy.statusPublished,
    };
  }
  return {
    className: "bg-[#F1F1EE] text-[#6C746A]",
    label: copy.statusUnlisted,
  };
}

function formatDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-black text-[#4F574F]">
      {label}
      {children}
    </label>
  );
}

function StoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-1">
      <p className="text-xl font-black text-[#111210]">{value}</p>
      <p className="mt-1 truncate text-[10px] font-bold text-[#7A8276]">
        {label}
      </p>
    </div>
  );
}
