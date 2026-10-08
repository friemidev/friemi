"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Ticket } from "lucide-react";
import {
  unlistCouponCampaignAction,
  type UnlistCouponCampaignState,
} from "@/features/coupons/actions/couponActions";
import type { getMerchantCouponDetail } from "@/features/coupons/queries/getMerchantCouponDetail";
import { withLocale } from "@/lib/routes";
import { CouponQrCode } from "./CouponQrCode";
import { getCampaignStatus, getCopy } from "./MerchantStoreDashboard";

type Detail = NonNullable<Awaited<ReturnType<typeof getMerchantCouponDetail>>>;
const initialUnlistState: UnlistCouponCampaignState = {};

export function MerchantCouponDetail({
  detail,
  locale,
}: {
  detail: Detail;
  locale: string;
}) {
  const copy = getCopy(locale);
  const { campaign, merchant } = detail;
  const [confirmUnlist, setConfirmUnlist] = useState(false);
  const [unlistState, unlistAction, unlistPending] = useActionState(
    unlistCouponCampaignAction,
    initialUnlistState,
  );
  const wasUnlisted = unlistState.status === "UNLISTED";
  const status = wasUnlisted
    ? { className: "bg-fog text-ink/70", label: copy.statusUnlisted }
    : getCampaignStatus(campaign, copy);
  const canShowQr =
    !wasUnlisted &&
    (campaign.claimAvailability === "AVAILABLE" ||
      campaign.claimAvailability === "NOT_STARTED") &&
    Boolean(campaign.claimToken);
  const canUnlist = campaign.campaignStatus === "PUBLISHED" && !wasUnlisted;
  const path = campaign.claimToken
    ? withLocale(locale, `/coupons/claim/${campaign.claimToken}`)
    : null;
  const remaining = campaign.quantityLimit === null
    ? null
    : Math.max(campaign.quantityLimit - campaign.claimedCount, 0);
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(date));

  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-3xl px-4 pb-28 sm:px-6 md:pb-16">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.couponManage}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile/store/coupons")}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">{copy.couponDetail}</h1>
        </header>

        <section className="pt-6" aria-labelledby="merchant-coupon-title">
          <p className="text-sm font-semibold text-forest">{merchant.name}</p>
          <div className="mt-4 flex items-start gap-4">
            <span className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-fog text-forest sm:h-24 sm:w-24">
              {campaign.imageUrl ? (
                <Image alt="" className="object-cover" fill sizes="96px" src={campaign.imageUrl} />
              ) : (
                <Ticket aria-hidden="true" className="h-8 w-8" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-bold leading-tight sm:text-2xl" id="merchant-coupon-title">
                {campaign.title}
              </h2>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                {status.label}
              </span>
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink/80">
            {campaign.description}
          </p>
          {campaign.terms ? (
            <div className="mt-5">
              <h3 className="text-sm font-bold">{copy.conditions}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink/70">
                {campaign.terms}
              </p>
            </div>
          ) : null}
          <dl className="mt-7 grid grid-cols-2 gap-4 rounded-2xl bg-fog/70 px-5 py-5 sm:grid-cols-3">
            <Metric label={copy.claimed} value={campaign.claimedCount} />
            {remaining !== null ? <Metric label={copy.remaining} value={remaining} /> : null}
            {campaign.expiresAt ? (
              <div>
                <dt className="text-xs text-ink/65">{copy.validUntil}</dt>
                <dd className="mt-1 text-sm font-bold">{formatDate(campaign.expiresAt)}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {canShowQr && path ? (
          <section className="mt-8 rounded-2xl bg-fog/70 px-5 py-6" aria-labelledby="merchant-coupon-qr-heading">
            <h2 className="text-lg font-bold" id="merchant-coupon-qr-heading">
              {copy.qr}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              {campaign.claimAvailability === "NOT_STARTED"
                ? copy.scheduledHint
                : copy.couponHelp}
            </p>
            <div className="mt-5">
              <CouponQrCode copiedLabel={copy.copied} copyLabel={copy.copyLink} path={path} />
            </div>
          </section>
        ) : null}

        {canUnlist ? (
          <section className="mt-10" aria-label={copy.unlist}>
            {confirmUnlist ? (
              <div className="rounded-2xl bg-fog/70 px-5 py-5">
                <p className="text-sm leading-6 text-ink/80">{copy.unlistHint}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={unlistAction}>
                    <input name="couponId" type="hidden" value={campaign.id} />
                    <input name="locale" type="hidden" value={locale} />
                    <button
                      className="min-h-11 rounded-full bg-danger px-4 text-sm font-semibold text-white disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      disabled={unlistPending}
                      type="submit"
                    >
                      {copy.unlistConfirm}
                    </button>
                  </form>
                  <button
                    className="min-h-11 rounded-full px-4 text-sm font-semibold text-ink/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    onClick={() => setConfirmUnlist(false)}
                    type="button"
                  >
                    {copy.unlistCancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="min-h-11 text-sm font-semibold text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                onClick={() => setConfirmUnlist(true)}
                type="button"
              >
                {copy.unlist}
              </button>
            )}
          </section>
        ) : null}
        {unlistState.status === "UNLISTED" ? (
          <p className="mt-6 text-sm font-semibold text-forest" role="status">
            {copy.statusUnlisted}
          </p>
        ) : unlistState.status ? (
          <p className="mt-6 text-sm font-semibold text-danger" role="alert">
            {copy.unlistError}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-ink/65">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
