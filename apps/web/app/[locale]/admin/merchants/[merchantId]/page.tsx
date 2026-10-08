import { notFound, redirect } from "next/navigation";
import { MerchantDetailView } from "@/components/admin/MerchantDetailView";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchant } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type MerchantDetailPageProps = {
  params: Promise<{ locale: string; merchantId: string }>;
};

export default async function MerchantDetailPage({
  params,
}: MerchantDetailPageProps) {
  const { locale, merchantId } = await params;
  await requireAdminPageAccess(locale, `/admin/merchants/${merchantId}`);
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const merchant = await getAdminMerchant(merchantId);
  if (!merchant) notFound();

  return <MerchantDetailView locale={locale} merchant={merchant} />;
}
