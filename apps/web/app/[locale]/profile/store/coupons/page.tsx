import { notFound } from "next/navigation";
import { MerchantCouponList } from "@/features/coupons/components/MerchantCouponList";
import { getMerchantStoreDashboard } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type MerchantCouponsPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantCouponsPage({
  params,
}: MerchantCouponsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/coupons",
  );
  const dashboard = await getMerchantStoreDashboard(profile.id);

  if (!dashboard) notFound();

  return <MerchantCouponList dashboard={dashboard} locale={locale} />;
}
