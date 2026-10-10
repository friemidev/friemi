"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  PencilLine,
  Store,
  Ticket,
  TicketCheck,
} from "lucide-react";
import {
  updateMerchantStoreAction,
  type UpdateMerchantStoreState,
} from "@/features/coupons/actions/couponActions";
import type { MerchantStoreDashboardViewModel } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { withLocale } from "@/lib/routes";

const initialUpdateState: UpdateMerchantStoreState = {};
export type Campaign = MerchantStoreDashboardViewModel["campaigns"][number];

export function getCopy(locale: string) {
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
      couponDetail: "Détails du coupon",
      conditions: "Conditions",
      campaignList: "Coupons publiés",
      pageSummary: (start: number, end: number, total: number) =>
        `${start}–${end} sur ${total}`,
      previousPage: "Précédent",
      nextPage: "Suivant",
      pageNumber: (page: number, total: number) => `${page} / ${total}`,
      couponManageHint: "Publier, partager et suivre les coupons",
      ticketManage: "Billets d'événement",
      ticketManageHint:
        "Contrôler les billets, gérer l'équipe et consulter l'historique",
      residencyManage: "Réservations boutique",
      residencyManageHint:
        "Sortie permanente, disponibilités et demandes clients",
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
      couponDetail: "Coupon details",
      conditions: "Conditions",
      campaignList: "Published coupons",
      pageSummary: (start: number, end: number, total: number) =>
        `${start}–${end} of ${total}`,
      previousPage: "Previous",
      nextPage: "Next",
      pageNumber: (page: number, total: number) => `${page} / ${total}`,
      couponManageHint: "Publish, share, and track coupons",
      ticketManage: "Event tickets",
      ticketManageHint: "Check tickets, manage staff, and review history",
      residencyManage: "Store bookings",
      residencyManageHint: "Permanent meetup, availability, and guest requests",
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
    couponDetail: "优惠券详情",
    conditions: "使用条件",
    campaignList: "已发布的券",
    pageSummary: (start: number, end: number, total: number) =>
      `第 ${start}–${end} 张，共 ${total} 张`,
    previousPage: "上一页",
    nextPage: "下一页",
    pageNumber: (page: number, total: number) => `${page} / ${total}`,
    couponManageHint: "发布、分享与查看领取情况",
    ticketManage: "活动票券",
    ticketManageHint: "核销票券、邀请工作人员、查看记录",
    residencyManage: "店铺预约",
    residencyManageHint: "长期聚吧、开放设置与顾客预约",
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

export function MerchantStoreHome({
  dashboard,
  locale,
}: {
  dashboard: Pick<MerchantStoreDashboardViewModel, "merchant">;
  locale: string;
}) {
  const copy = getCopy(locale);

  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
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

        <nav className="space-y-1" aria-label={copy.title}>
          <Link
            className="flex min-h-20 items-center gap-4 rounded-2xl px-1 py-4 transition hover:bg-fog/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store/bookings")}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">
                {copy.residencyManage}
              </span>
              <span className="mt-0.5 block text-sm text-ink/65">
                {copy.residencyManageHint}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink/45" />
          </Link>
          <Link
            className="flex min-h-20 items-center gap-4 rounded-2xl px-1 py-4 transition hover:bg-fog/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store/tickets")}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest text-white">
              <TicketCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">
                {copy.ticketManage}
              </span>
              <span className="mt-0.5 block text-sm text-ink/65">
                {copy.ticketManageHint}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink/45" />
          </Link>
          <Link
            className="flex min-h-20 items-center gap-4 rounded-2xl px-1 py-4 transition hover:bg-fog/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
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
            className="flex min-h-20 items-center gap-4 rounded-2xl px-1 py-4 transition hover:bg-fog/60 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
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
  dashboard: Pick<MerchantStoreDashboardViewModel, "merchant">;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [storeState, storeAction, storePending] = useActionState(
    updateMerchantStoreAction,
    initialUpdateState,
  );

  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
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

export function getCampaignStatus(
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
