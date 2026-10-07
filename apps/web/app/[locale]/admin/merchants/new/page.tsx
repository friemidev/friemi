import { redirect } from "next/navigation";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantCreateClient } from "@/components/admin/MerchantManagementClient";
import { getMerchantAdminCopy } from "@/components/admin/merchantAdminCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type NewMerchantPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewMerchantPage({
  params,
}: NewMerchantPageProps) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants/new");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const copy = getMerchantAdminCopy(locale);

  return (
    <PageContainer className="merchant-admin-page app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.1rem] max-w-4xl space-y-6 pb-16 max-md:px-4 max-md:py-0 md:py-10">
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants")}
        backLabel={copy.common.backToList}
        title={copy.create.pageTitle}
      />

      <p className="max-w-2xl text-sm leading-6 text-ink/70">
        {copy.create.intro}
      </p>

      <MerchantCreateClient locale={locale} />
    </PageContainer>
  );
}
