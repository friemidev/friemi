import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, History } from "lucide-react";
import {
  BookingHeader,
  BookingShell,
  formatBookingDate,
} from "@/features/merchants/bookings/components/BookingPrimitives";
import { getBookingCopy } from "@/features/merchants/bookings/copy";
import { getOwnerResidencySlots } from "@/features/merchants/residency/queries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function LegacyBookingHistoryRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    "/profile/store/bookings/history",
  );
  const data = await getOwnerResidencySlots(profile.id);
  if (!data.merchant) notFound();
  const copy = getBookingCopy(locale);
  return (
    <BookingShell>
      <BookingHeader
        backHref="/profile/store/bookings"
        locale={locale}
        title={copy.legacy}
      />
      <ol className="space-y-3 pt-5">
        {data.slots.map((slot) => (
          <li key={slot.id}>
            <Link
              className="flex min-h-20 items-center gap-3 rounded-xl bg-fog/70 px-4 py-4 transition-colors hover:bg-fog focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={withLocale(locale, `/profile/store/bookings/${slot.id}`)}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-forest">
                <CalendarDays aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {slot.title}
                </span>
                <span className="mt-1 block text-xs text-ink/70">
                  {formatBookingDate(slot.date, locale)}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ol>
      {!data.slots.length ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-fog/60 px-4 py-10 text-center">
          <History aria-hidden="true" className="h-6 w-6 text-forest/70" />
          <p className="text-sm text-ink/70">{copy.noHistory}</p>
        </div>
      ) : null}
    </BookingShell>
  );
}
