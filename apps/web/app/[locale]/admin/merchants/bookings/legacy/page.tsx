import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { MerchantAdminHeader } from "@/components/admin/MerchantAdminHeader";
import { getMerchantBookingAdminCopy } from "@/components/admin/merchantBookingCopy";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAdminResidencyCopy } from "@/features/merchants/residency/adminCopy";
import { formatResidencyDate } from "@/features/merchants/residency/components/ResidencyCalendar";
import {
  getAdminResidencySlots,
  type ResidencySlotSummary,
} from "@/features/merchants/residency/queries";
import { isCurrentUserAdmin, requireAdminPageAccess } from "@/lib/admin-auth";
import { withLocale } from "@/lib/routes";
import { noIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

function SlotList({
  locale,
  slots,
}: {
  locale: string;
  slots: ResidencySlotSummary[];
}) {
  const copy = getAdminResidencyCopy(locale);
  return (
    <ol className="mt-4 space-y-2">
      {slots.map((slot) => (
        <li key={slot.id}>
          <Link
            className="group flex min-h-20 items-center gap-4 rounded-2xl bg-fog/70 px-4 py-3 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, `/admin/merchants/bookings/${slot.id}`)}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-forest">
              <CalendarDays aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold sm:text-base">
                {slot.merchant.name} · {slot.title}
              </span>
              <span className="mt-1 block text-xs text-ink/65 sm:text-sm">
                {formatResidencyDate(slot.date, locale)}
              </span>
              <span className="mt-1 block text-xs font-semibold text-forest">
                {copy.status[slot.status]}
                {slot.status === "CONFIRMED" || slot.status === "PUBLISHED"
                  ? ` · ${copy.signups(slot.signupCount)}`
                  : ""}
              </span>
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-forest"
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function AdminResidencyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPageAccess(locale, "/admin/merchants/bookings/legacy");
  if (!(await isCurrentUserAdmin())) redirect(withLocale(locale, "/"));
  const slots = await getAdminResidencySlots();
  const copy = getAdminResidencyCopy(locale);
  const bookingCopy = getMerchantBookingAdminCopy(locale);

  return (
    <PageContainer
      mobileSafeTop
      className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] max-w-3xl space-y-9 pb-16 max-md:px-4 max-md:py-0 md:py-10"
    >
      <MerchantAdminHeader
        backHref={withLocale(locale, "/admin/merchants/bookings")}
        backLabel={bookingCopy.title}
        title={bookingCopy.legacy}
      />
      <section>
        {slots.length ? (
          <SlotList locale={locale} slots={slots} />
        ) : (
          <p className="mt-4 rounded-2xl bg-fog/70 px-5 py-8 text-sm text-ink/65">
            {copy.emptyOther}
          </p>
        )}
      </section>
    </PageContainer>
  );
}
