import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { CouponRedemptionPanel } from "@/features/coupons/components/CouponRedemptionPanel";
import { getCouponRedemptionPreview } from "@/features/coupons/services/couponService";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

type CouponRedemptionPageProps = {
  params: Promise<{
    locale: string;
    redemptionToken: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function CouponRedemptionPage({
  params,
}: CouponRedemptionPageProps) {
  const { locale, redemptionToken } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/coupons/redeem/${redemptionToken}`,
  );
  const item = await getCouponRedemptionPreview({
    profileId: profile.id,
    redemptionToken,
  });
  const invalid =
    locale === "fr"
      ? "Ce coupon n'appartient pas à votre boutique ou n'existe pas."
      : locale === "en"
        ? "This coupon does not belong to your store or no longer exists."
        : "此优惠券不属于你的门店，或已经不存在。";

  return (
    <main className="app-mobile-page-shell min-h-svh bg-[#F6F7F2] px-5 pb-12 pt-5">
      <Link
        aria-label="Back"
        className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#123D31] ring-1 ring-[#D6D5B2]"
        href={withLocale(locale, "/profile/store")}
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="mt-8 grid place-items-center">
        {item ? (
          <CouponRedemptionPanel
            couponTitle={item.coupon.title}
            customerName={item.owner.nickname}
            initialAvailable={item.isAvailable}
            locale={locale}
            merchantName={item.coupon.merchant.name}
            redemptionToken={redemptionToken}
          />
        ) : (
          <section className="w-full max-w-sm rounded-[1.25rem] bg-white p-6 text-center ring-1 ring-[#D6D5B2]">
            <CircleAlert className="mx-auto h-8 w-8 text-[#A62834]" />
            <p className="mt-4 text-sm font-bold leading-6 text-[#6C746A]">
              {invalid}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
