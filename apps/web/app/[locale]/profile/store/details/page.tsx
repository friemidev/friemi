import { notFound } from "next/navigation";
import { MerchantStoreDetails } from "@/features/coupons/components/MerchantStoreDashboard";
import { getMerchantStoreDashboard } from "@/features/coupons/queries/getMerchantStoreDashboard";
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
  const dashboard = await getMerchantStoreDashboard(profile.id);

  if (!dashboard) notFound();

  return <MerchantStoreDetails dashboard={dashboard} locale={locale} />;
}
