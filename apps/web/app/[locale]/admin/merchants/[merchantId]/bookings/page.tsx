import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { MerchantBookingAccessForm } from "@/components/admin/MerchantBookingAccessForm";
import { getMerchantBookingAdminCopy } from "@/components/admin/merchantBookingCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantBookingAccessPage({
  params,
}: {
  params: Promise<{ locale: string; merchantId: string }>;
}) {
  const { locale, merchantId } = await params;
  await requireAdminPageAccess(
    locale,
    `/admin/merchants/${merchantId}/bookings`,
  );
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      id: true,
      name: true,
      bookingAccessEnabled: true,
      ownerProfileId: true,
      bookingSettings: { select: { activityId: true, enabled: true } },
    },
  });
  if (!merchant) notFound();
  const copy = getMerchantBookingAdminCopy(locale);
  return (
    <PageContainer
      mobileSafeTop
      className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] max-w-2xl pb-16 max-md:px-4 max-md:py-0 md:py-10"
    >
      <MerchantAdminHeader
        backHref={withLocale(locale, `/admin/merchants/${merchant.id}`)}
        backLabel={copy.detailBack}
        title={copy.title}
      />
      <section className="pt-8">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          {merchant.name}
        </h2>
        <p className="mt-3 text-sm font-semibold text-forest">
          {merchant.bookingAccessEnabled ? copy.granted : copy.denied}
        </p>
        {merchant.bookingAccessEnabled ? (
          <p className="mt-2 text-sm text-ink/70">
            {merchant.bookingSettings
              ? merchant.bookingSettings.enabled
                ? copy.enabled
                : copy.paused
              : copy.unconfigured}
          </p>
        ) : null}
        {!merchant.ownerProfileId ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-ink/70">{copy.noOwner}</p>
            <Link
              className="inline-flex min-h-11 items-center font-semibold text-forest underline underline-offset-4"
              href={withLocale(
                locale,
                `/admin/merchants/upgrade?merchantId=${merchant.id}`,
              )}
            >
              {copy.bindOwner}
            </Link>
          </div>
        ) : null}
        <MerchantBookingAccessForm
          locale={locale}
          merchantId={merchant.id}
          granted={merchant.bookingAccessEnabled}
          hasOwner={Boolean(merchant.ownerProfileId)}
        />
        {merchant.bookingSettings ? (
          <Link
            className="mt-8 inline-flex min-h-11 items-center font-semibold text-forest underline underline-offset-4"
            href={withLocale(
              locale,
              `/lobby/${merchant.bookingSettings.activityId}`,
            )}
          >
            {copy.viewMeetup}
          </Link>
        ) : null}
      </section>
    </PageContainer>
  );
}
