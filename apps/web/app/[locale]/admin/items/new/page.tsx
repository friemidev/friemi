import { redirect } from "next/navigation";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";
import { CreateTicketDefinitionForm } from "@/features/inventory/components/AdminTicketForms";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { getAdminMerchantOptions } from "@/lib/admin-scraper";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AdminItemNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/items/new");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const copy = getAdminItemCopy(locale);
  const merchants = await getAdminMerchantOptions();

  return (
    <PageContainer mobileSafeTop className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-3xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants?view=items")}
        backLabel={copy.frame.backToList}
        title={copy.newItem.pageTitle}
      />
      <div className="rounded-2xl bg-paper p-5 sm:p-6">
        <CreateTicketDefinitionForm
          locale={locale}
          merchants={merchants}
          showHeading={false}
        />
      </div>
    </PageContainer>
  );
}
