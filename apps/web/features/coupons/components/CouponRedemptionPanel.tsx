"use client";

import Image from "next/image";
import { useActionState } from "react";
import {
  BadgeCheck,
  Gift,
  LoaderCircle,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import {
  redeemCouponAction,
  grantFollowUpCouponAction,
  type GrantFollowUpCouponState,
  type RedeemCouponState,
} from "@/features/coupons/actions/couponActions";

const initialState: RedeemCouponState = {};
const initialGrantState: GrantFollowUpCouponState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      already: "Ce coupon a déjà été utilisé.",
      confirm: "Confirmer l'utilisation",
      confirmed: "Coupon utilisé",
      customer: "Client",
      error: "Ce coupon ne peut pas être utilisé ici.",
      hint: "Vérifiez le client et le coupon avant de confirmer.",
      grant: "Offrir le même coupon",
      granted: "Un nouveau coupon a été envoyé au client.",
      grantError: "Le nouveau coupon n'a pas pu être envoyé.",
      granting: "Envoi...",
      processing: "Validation...",
    };
  }
  if (locale === "en") {
    return {
      already: "This coupon has already been redeemed.",
      confirm: "Confirm redemption",
      confirmed: "Coupon redeemed",
      customer: "Customer",
      error: "This coupon cannot be redeemed here.",
      hint: "Check the customer and coupon before confirming.",
      grant: "Send the same coupon again",
      granted: "A new coupon was sent to the customer.",
      grantError: "The new coupon could not be sent.",
      granting: "Sending...",
      processing: "Redeeming...",
    };
  }
  return {
    already: "这张优惠券已经核销过了。",
    confirm: "确认核销",
    confirmed: "核销成功",
    customer: "持券用户",
    error: "此优惠券无法在当前门店核销。",
    hint: "请核对持券用户和优惠券信息，确认后无法撤销。",
    grant: "再送一张同款优惠券",
    granted: "新优惠券已放入该用户背包。",
    grantError: "赠送失败，请稍后重试。",
    granting: "赠送中...",
    processing: "核销中...",
  };
}

export function CouponRedemptionPanel({
  couponTitle,
  customerName,
  followUpGranted,
  initialAvailable,
  initialRedeemed,
  locale,
  merchantName,
  redemptionItemId,
  redemptionToken,
}: {
  couponTitle: string;
  customerName: string;
  followUpGranted: boolean;
  initialAvailable: boolean;
  initialRedeemed: boolean;
  locale: string;
  merchantName: string;
  redemptionItemId: string;
  redemptionToken: string;
}) {
  const copy = getCopy(locale);
  const [state, formAction, pending] = useActionState(
    redeemCouponAction,
    initialState,
  );
  const [grantState, grantAction, grantPending] = useActionState(
    grantFollowUpCouponAction,
    initialGrantState,
  );
  const success = state.status === "REDEEMED";
  const already = state.status === "ALREADY_REDEEMED" || initialRedeemed;
  const unavailable = !initialAvailable && !initialRedeemed;
  const error =
    state.status === "FORBIDDEN" ||
    state.status === "INVALID" ||
    state.status === "UNAVAILABLE" ||
    unavailable;
  const canGrant = success || already;
  const granted =
    followUpGranted ||
    grantState.status === "GRANTED" ||
    grantState.status === "ALREADY_GRANTED";

  return (
    <section className="w-full max-w-sm overflow-hidden rounded-[1.25rem] bg-white shadow-[0_24px_60px_rgba(16,37,31,0.16)] ring-1 ring-[#D6D5B2]">
      <div className="bg-[#0F6D46] p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <Image
            alt="Friemi"
            className="h-auto w-20 object-contain"
            height={24}
            src="/brand/v2_1/friemi-lockup-horizontal-white.png"
            width={80}
          />
          <TicketCheck className="h-7 w-7 text-[#F1F2E3]" />
        </div>
        <h1 className="mt-4 text-2xl font-black leading-8">{couponTitle}</h1>
        <p className="mt-2 text-sm font-bold text-white/70">{merchantName}</p>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#7A8276]">{copy.customer}</p>
            <p className="mt-1 truncate text-base font-black text-[#111210]">
              {customerName}
            </p>
          </div>
        </div>

        {success ? (
          <div className="mt-5 flex items-center gap-3 rounded-[1rem] bg-[#EAF5E8] px-4 py-4 text-sm font-black text-[#156240]">
            <BadgeCheck className="h-5 w-5 shrink-0" />
            {copy.confirmed}
          </div>
        ) : !already ? (
          <>
            <p className="mt-5 text-sm font-semibold leading-6 text-[#6C746A]">
              {already ? copy.already : error ? copy.error : copy.hint}
            </p>
            <form action={formAction} className="mt-5">
              <input name="locale" type="hidden" value={locale} />
              <input
                name="redemptionToken"
                type="hidden"
                value={redemptionToken}
              />
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white disabled:opacity-50"
                disabled={pending || already || error}
                type="submit"
              >
                {pending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {pending ? copy.processing : copy.confirm}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-5 text-sm font-semibold leading-6 text-[#6C746A]">
            {copy.already}
          </p>
        )}

        {canGrant ? (
          <form
            action={grantAction}
            className="mt-4 border-t border-[#EFEAD7] pt-4"
          >
            <input name="locale" type="hidden" value={locale} />
            <input
              name="redemptionItemId"
              type="hidden"
              value={redemptionItemId}
            />
            <input
              name="redemptionToken"
              type="hidden"
              value={redemptionToken}
            />
            {granted ? (
              <p className="flex items-center gap-2 text-sm font-black text-[#156240]">
                <Gift className="h-4 w-4" />
                {copy.granted}
              </p>
            ) : (
              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-black text-[#156240] ring-1 ring-[#8AB68E] disabled:opacity-50"
                disabled={grantPending}
                type="submit"
              >
                {grantPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                {grantPending ? copy.granting : copy.grant}
              </button>
            )}
            {grantState.status &&
            grantState.status !== "GRANTED" &&
            grantState.status !== "ALREADY_GRANTED" ? (
              <p className="mt-2 text-center text-xs font-bold text-[#A62834]">
                {copy.grantError}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}
