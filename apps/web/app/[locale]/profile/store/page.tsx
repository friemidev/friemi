import { notFound } from "next/navigation";
import { MerchantStoreDashboard } from "@/features/coupons/components/MerchantStoreDashboard";
import { getMerchantStoreDashboard } from "@/features/coupons/queries/getMerchantStoreDashboard";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type MerchantStorePageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantStorePage({
  params,
}: MerchantStorePageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/store");
  const dashboard = await getMerchantStoreDashboard(profile.id);

  if (!dashboard) notFound();

  return <MerchantStoreDashboard dashboard={dashboard} locale={locale} />;
}
