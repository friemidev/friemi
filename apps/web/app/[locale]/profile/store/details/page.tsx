import { notFound } from "next/navigation";
import { MerchantStoreDetails } from "@/features/coupons/components/MerchantStoreDashboard";
import { getMerchantStoreInfo } from "@/features/coupons/queries/getMerchantStoreInfo";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type MerchantStoreDetailsPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantStoreDetailsPage({
  params,
}: MerchantStoreDetailsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/details",
  );
  const merchant = await getMerchantStoreInfo(profile.id);

  if (!merchant) notFound();

  return <MerchantStoreDetails dashboard={{ merchant }} locale={locale} />;
}
