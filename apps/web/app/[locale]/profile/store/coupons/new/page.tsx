import { notFound } from "next/navigation";
import { MerchantCouponPublisher } from "@/features/coupons/components/MerchantCouponPublisher";
import { getMerchantCouponPublisher } from "@/features/coupons/queries/getMerchantCouponPublisher";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type MerchantCouponPublisherPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantCouponPublisherPage({
  params,
}: MerchantCouponPublisherPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/coupons/new",
  );
  const publisher = await getMerchantCouponPublisher(profile.id);

  if (!publisher) notFound();

  return <MerchantCouponPublisher locale={locale} publisher={publisher} />;
}
