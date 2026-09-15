import Link from "next/link";
import { CircleAlert, TicketCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { claimCouponByToken } from "@/features/coupons/services/couponService";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

type CouponClaimPageProps = {
  params: Promise<{
    claimToken: string;
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

function getCopy(
  locale: string,
  status: "INVALID" | "OWN_STORE" | "UNAVAILABLE",
) {
  if (locale === "fr") {
    return status === "OWN_STORE"
      ? "Vous ne pouvez pas recevoir le coupon de votre propre boutique."
      : status === "UNAVAILABLE"
        ? "Ce coupon n'est plus disponible."
        : "Ce QR code de coupon est invalide.";
  }
  if (locale === "en") {
    return status === "OWN_STORE"
      ? "You cannot claim your own store coupon."
      : status === "UNAVAILABLE"
        ? "This coupon is no longer available."
        : "This coupon QR code is invalid.";
  }
  return status === "OWN_STORE"
    ? "不能领取自己门店的优惠券。"
    : status === "UNAVAILABLE"
      ? "这张优惠券暂时无法领取。"
      : "这个优惠券二维码无效。";
}

export default async function CouponClaimPage({
  params,
}: CouponClaimPageProps) {
  const { claimToken, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/coupons/claim/${claimToken}`,
  );
  const result = await claimCouponByToken({
    claimToken,
    profileId: profile.id,
  });

  if (result.status === "CLAIMED" || result.status === "ALREADY_CLAIMED") {
    redirect(
      withLocale(
        locale,
        `/profile/bag?couponStatus=${result.status === "CLAIMED" ? "claimed" : "already-claimed"}`,
      ),
    );
  }

  const backLabel =
    locale === "en"
      ? "Open bag"
      : locale === "fr"
        ? "Ouvrir le sac"
        : "打开背包";

  return (
    <main className="app-mobile-page-shell grid min-h-svh place-items-center bg-[#F6F7F2] px-5 py-10">
      <section className="w-full max-w-sm rounded-[1.25rem] bg-white p-6 text-center ring-1 ring-[#D6D5B2]">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFF1F1] text-[#A62834]">
          <CircleAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black text-[#111210]">
          Friemi Coupon
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#6C746A]">
          {getCopy(locale, result.status)}
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white"
          href={withLocale(locale, "/profile/bag")}
        >
          <TicketCheck className="h-4 w-4" />
          {backLabel}
        </Link>
      </section>
    </main>
  );
}
