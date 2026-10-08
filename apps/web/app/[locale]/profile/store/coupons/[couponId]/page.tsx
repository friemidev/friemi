import { notFound } from "next/navigation";
import { MerchantCouponDetail } from "@/features/coupons/components/MerchantCouponDetail";
import { getMerchantCouponDetail } from "@/features/coupons/queries/getMerchantCouponDetail";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantCouponDetailPage({
  params,
}: {
  params: Promise<{ couponId: string; locale: string }>;
}) {
  const { couponId, locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/profile/store/coupons/${couponId}`,
  );
  const detail = await getMerchantCouponDetail(profile.id, couponId);
  if (!detail) notFound();

  return <MerchantCouponDetail detail={detail} locale={locale} />;
}
