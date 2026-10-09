import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { getMerchantBookingAdminCopy } from "@/components/admin/merchantBookingCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";
import { getBookingCopy } from "@/features/merchants/bookings/copy";
import { formatBookingDate } from "@/features/merchants/bookings/components/BookingPrimitives";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function MerchantBookingsOverviewPage({
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
      isActive: true,
      ownerProfileId: true,
      bookingSettings: {
        select: {
          activityId: true,
          enabled: true,
          scheduleMode: true,
          weekdays: true,
          specificDates: true,
          startDate: true,
          endDate: true,
          activity: { select: { title: true } },
        },
      },
    },
  });
  if (!merchant) notFound();
  const copy = getMerchantBookingAdminCopy(locale);
  const bookingCopy = getBookingCopy(locale);
  const settings = merchant.bookingSettings;
  const schedule =
    settings?.scheduleMode === "DAILY"
      ? bookingCopy.daily
      : settings?.scheduleMode === "WEEKLY"
        ? [1, 2, 3, 4, 5, 6, 0]
            .filter((day) => settings.weekdays.includes(day))
            .map((day) => bookingCopy.weekdays[day])
            .join(" · ")
        : settings?.specificDates
            .map((date) =>
              formatBookingDate(date.toISOString().slice(0, 10), locale),
            )
            .join(" · ");
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
          {!merchant.isActive
            ? copy.inactive
            : settings
              ? settings.enabled
                ? copy.enabled
                : copy.paused
              : copy.unconfigured}
        </p>
        {settings ? (
          <dl className="mt-7 space-y-5 text-sm">
            <div>
              <dt className="text-ink/70">{bookingCopy.permanent}</dt>
              <dd className="mt-1 font-semibold">{settings.activity.title}</dd>
            </div>
            <div>
              <dt className="text-ink/70">{bookingCopy.availability}</dt>
              <dd className="mt-1 font-semibold leading-6">{schedule}</dd>
            </div>
            <div>
              <dt className="text-ink/70">{bookingCopy.startDate}</dt>
              <dd className="mt-1 font-semibold">
                {formatBookingDate(
                  settings.startDate.toISOString().slice(0, 10),
                  locale,
                )}
              </dd>
            </div>
            {settings.endDate ? (
              <div>
                <dt className="text-ink/70">{bookingCopy.endDate}</dt>
                <dd className="mt-1 font-semibold">
                  {formatBookingDate(
                    settings.endDate.toISOString().slice(0, 10),
                    locale,
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {copy.description}
          </p>
        )}
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
