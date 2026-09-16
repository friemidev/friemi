"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Store,
  Ticket,
  UsersRound,
} from "lucide-react";
import {
  generateCouponClaimCodeAction,
  updateMerchantStoreAction,
  type GenerateCouponClaimCodeState,
  type UpdateMerchantStoreState,
} from "@/features/coupons/actions/couponActions";
import type { MerchantStoreDashboardViewModel } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { withLocale } from "@/lib/routes";
import { CouponQrCode } from "./CouponQrCode";
import { CouponRedemptionScanner } from "./CouponRedemptionScanner";

const initialUpdateState: UpdateMerchantStoreState = {};
const initialClaimCodeState: GenerateCouponClaimCodeState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      available: "Disponibles",
      back: "Profil",
      claimed: "Reçus",
      claimedAt: "Reçu",
      coupon: "Distribuer un coupon",
      couponHint:
        "Chaque QR code ne peut être reçu qu'une seule fois. Actualisez-le pour le client suivant.",
      copy: "Copier le lien",
      copied: "Lien copié",
      description: "Présentation",
      edit: "Informations de la boutique",
      error: "Vérifiez le nom et la présentation.",
      name: "Nom de la boutique",
      recent: "Activité récente",
      generate: "Générer le QR code",
      refresh: "Actualiser le QR code",
      selectCoupon: "Choisir un coupon",
      codeError: "Impossible de générer ce QR code.",
      redeemed: "Utilisés",
      redeemedAt: "Utilisé",
      save: "Enregistrer",
      saved: "Boutique mise à jour",
      title: "Boutique",
    };
  }
  if (locale === "en") {
    return {
      available: "Available",
      back: "Profile",
      claimed: "Claimed",
      claimedAt: "Claimed",
      coupon: "Issue coupon",
      couponHint:
        "Each QR code can be claimed once. Refresh it for the next customer.",
      copy: "Copy link",
      copied: "Link copied",
      description: "Description",
      edit: "Store details",
      error: "Check the store name and description.",
      name: "Store name",
      recent: "Recent activity",
      generate: "Generate QR code",
      refresh: "Refresh QR code",
      selectCoupon: "Choose coupon",
      codeError: "This QR code could not be generated.",
      redeemed: "Redeemed",
      redeemedAt: "Redeemed",
      save: "Save",
      saved: "Store updated",
      title: "Store",
    };
  }
  return {
    available: "待使用",
    back: "个人主页",
    claimed: "已领取",
    claimedAt: "领取于",
    coupon: "发放优惠券",
    couponHint: "每个领取二维码只能被领取一次，下一位客人领取前请刷新二维码。",
    copy: "复制领取链接",
    copied: "链接已复制",
    description: "门店介绍",
    edit: "门店资料",
    error: "请检查门店名称和介绍。",
    name: "店铺名称",
    recent: "最近领取",
    generate: "生成领取二维码",
    refresh: "刷新领取二维码",
    selectCoupon: "选择优惠券",
    codeError: "领取二维码生成失败，请稍后重试。",
    redeemed: "已核销",
    redeemedAt: "核销于",
    save: "保存资料",
    saved: "门店资料已更新",
    title: "门店",
  };
}

export function MerchantStoreDashboard({
  dashboard,
  locale,
}: {
  dashboard: MerchantStoreDashboardViewModel;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [state, formAction, pending] = useActionState(
    updateMerchantStoreAction,
    initialUpdateState,
  );
  const [selectedCouponId, setSelectedCouponId] = useState(
    dashboard.coupons[0]?.id ?? "",
  );
  const [claimCodeState, claimCodeAction, claimCodePending] = useActionState(
    generateCouponClaimCodeAction,
    initialClaimCodeState,
  );
  const selectedCoupon =
    dashboard.coupons.find((coupon) => coupon.id === selectedCouponId) ??
    dashboard.coupons[0];
  const activeClaimPath = selectedCoupon
    ? claimCodeState.status === "GENERATED" &&
      claimCodeState.couponId === selectedCoupon.id
      ? (claimCodeState.path ?? null)
      : selectedCoupon.activeClaimToken
        ? withLocale(
            locale,
            `/coupons/claim/${selectedCoupon.activeClaimToken}`,
          )
        : null
    : null;

  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#F7F8F4] pb-12">
      <header className="flex items-center justify-between bg-white px-5 pb-4 pt-5">
        <Link
          aria-label={copy.back}
          className="grid h-10 w-10 place-items-center rounded-full text-[#123D31] ring-1 ring-[#D6D5B2]"
          href={withLocale(locale, "/profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black text-[#111210]">{copy.title}</h1>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
          <Store className="h-5 w-5" />
        </span>
      </header>

      <section className="bg-white px-5 pb-7 pt-2">
        <p className="text-[11px] font-black uppercase text-[#6C746A]">
          Friemi Partner
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-[#111210]">
          {dashboard.merchant.name}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#6C746A]">
          {dashboard.merchant.description}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#EFEAD7] pt-5 text-center">
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
      </section>

      <section className="px-5 py-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#111210]">{copy.coupon}</h2>
          <Ticket className="h-5 w-5 text-[#156240]" />
        </div>

        <label className="mt-4 grid gap-2 text-xs font-black text-[#4F574F]">
          {copy.selectCoupon}
          <select
            className="h-12 rounded-[0.75rem] bg-white px-4 text-sm font-bold text-[#111210] outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
            onChange={(event) => setSelectedCouponId(event.target.value)}
            value={selectedCoupon?.id ?? ""}
          >
            {dashboard.coupons.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.title}
              </option>
            ))}
          </select>
        </label>

        {selectedCoupon ? (
          <>
            {selectedCoupon.imageUrl ? (
              <div className="mt-4 overflow-hidden rounded-[1rem] bg-white shadow-[0_18px_40px_rgba(15,109,70,0.14)] ring-1 ring-[#D6D5B2]">
                <Image
                  alt={selectedCoupon.title}
                  className="aspect-[4/3] h-auto w-full object-cover"
                  height={1086}
                  priority
                  sizes="(max-width: 640px) calc(100vw - 2.5rem), 36rem"
                  src={selectedCoupon.imageUrl}
                  width={1448}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-[#111210]">
                        {selectedCoupon.title}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-[#156240]">
                        {dashboard.merchant.name}
                      </p>
                    </div>
                    <BadgeCheck
                      className="h-6 w-6 shrink-0"
                      style={{ color: selectedCoupon.accentColor }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-[#6C746A]">
                    {selectedCoupon.description}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="relative mt-4 overflow-hidden rounded-[1rem] p-5 shadow-[0_18px_40px_rgba(15,109,70,0.2)]"
                style={{
                  backgroundColor: selectedCoupon.backgroundColor,
                  color: selectedCoupon.foregroundColor,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-md bg-white/95 px-2 py-1 shadow-sm">
                      <Image
                        alt="Friemi"
                        className="h-auto w-20 object-contain"
                        height={24}
                        src="/brand/v2_1/friemi-lockup-horizontal-navy.png"
                        width={80}
                      />
                    </span>
                    <h3 className="mt-2 text-2xl font-black leading-8">
                      {selectedCoupon.title}
                    </h3>
                  </div>
                  <BadgeCheck
                    className="h-8 w-8 shrink-0"
                    style={{ color: selectedCoupon.accentColor }}
                  />
                </div>
                <p className="mt-5 text-sm font-semibold leading-6 opacity-75">
                  {selectedCoupon.description}
                </p>
                <p
                  className="mt-5 border-t border-dashed pt-4 text-sm font-black"
                  style={{
                    borderColor: selectedCoupon.accentColor,
                    color: selectedCoupon.accentColor,
                  }}
                >
                  {dashboard.merchant.name}
                </p>
              </div>
            )}

            <div className="mt-4 rounded-[1rem] bg-white p-4 ring-1 ring-[#D6D5B2]">
              {activeClaimPath ? (
                <CouponQrCode
                  copiedLabel={copy.copied}
                  copyLabel={copy.copy}
                  path={activeClaimPath}
                />
              ) : null}
              <p className="mx-auto mt-3 max-w-xs text-center text-xs font-semibold leading-5 text-[#6C746A]">
                {copy.couponHint}
              </p>
              {claimCodeState.status &&
              claimCodeState.status !== "GENERATED" ? (
                <p className="mt-2 text-center text-xs font-bold text-[#A62834]">
                  {copy.codeError}
                </p>
              ) : null}
              <form action={claimCodeAction} className="mt-4">
                <input
                  name="couponId"
                  type="hidden"
                  value={selectedCoupon.id}
                />
                <input name="locale" type="hidden" value={locale} />
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white disabled:opacity-55"
                  disabled={claimCodePending}
                  type="submit"
                >
                  {claimCodePending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : activeClaimPath ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Ticket className="h-4 w-4" />
                  )}
                  {activeClaimPath ? copy.refresh : copy.generate}
                </button>
              </form>
            </div>
          </>
        ) : null}
        <div className="mt-3">
          <CouponRedemptionScanner locale={locale} />
        </div>
      </section>

      <section className="border-y border-[#EFEAD7] bg-white px-5 py-7">
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-[#156240]" />
          <h2 className="text-base font-black text-[#111210]">{copy.edit}</h2>
        </div>
        <form action={formAction} className="mt-4 grid gap-4">
          <input name="locale" type="hidden" value={locale} />
          <label className="grid gap-2 text-xs font-black text-[#4F574F]">
            {copy.name}
            <input
              className="h-12 rounded-[0.75rem] bg-[#F7F8F4] px-4 text-sm font-bold text-[#111210] outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
              defaultValue={dashboard.merchant.name}
              maxLength={80}
              name="name"
              required
            />
          </label>
          <label className="grid gap-2 text-xs font-black text-[#4F574F]">
            {copy.description}
            <textarea
              className="min-h-28 resize-y rounded-[0.75rem] bg-[#F7F8F4] px-4 py-3 text-sm font-semibold leading-6 text-[#111210] outline-none ring-1 ring-[#D6D5B2] focus:ring-2 focus:ring-[#8AB68E]"
              defaultValue={dashboard.merchant.description}
              maxLength={1200}
              name="description"
              required
            />
          </label>
          {state.success ? (
            <p className="text-sm font-bold text-[#156240]">{copy.saved}</p>
          ) : null}
          {state.error ? (
            <p className="text-sm font-bold text-[#A62834]">{copy.error}</p>
          ) : null}
          <button
            className="h-11 rounded-full bg-[#111210] px-5 text-sm font-black text-white disabled:opacity-55"
            disabled={pending}
            type="submit"
          >
            {copy.save}
          </button>
        </form>
      </section>

      <section className="px-5 py-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#111210]">{copy.recent}</h2>
          <UsersRound className="h-5 w-5 text-[#156240]" />
        </div>
        <div className="mt-3 divide-y divide-[#EFEAD7] bg-white px-4 ring-1 ring-[#D6D5B2]">
          {dashboard.recentItems.map((item) => (
            <div className="flex items-center gap-3 py-3.5" key={item.id}>
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EAF5E8] text-sm font-black text-[#156240]">
                {item.owner.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={item.owner.avatarUrl}
                  />
                ) : (
                  item.owner.nickname.slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-[#111210]">
                  {item.owner.nickname}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#7A8276]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {item.redeemedAt ? copy.redeemedAt : copy.claimedAt} ·{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(item.redeemedAt ?? item.claimedAt))}
                </p>
                <p className="mt-1 truncate text-[11px] font-bold text-[#156240]">
                  {item.coupon.title}
                </p>
              </div>
              <span className="text-xs font-black text-[#156240]">
                {item.status === "REDEEMED" ? copy.redeemed : copy.available}
              </span>
            </div>
          ))}
          {dashboard.recentItems.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-[#7A8276]">
              -
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function StoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-2xl font-black text-[#111210]">{value}</p>
      <p className="mt-1 truncate text-[11px] font-bold text-[#7A8276]">
        {label}
      </p>
    </div>
  );
}
