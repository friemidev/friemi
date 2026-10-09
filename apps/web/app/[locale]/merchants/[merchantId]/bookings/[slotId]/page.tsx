import { notFound } from "next/navigation";
import Link from "next/link";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import {
  BookingHeader,
  BookingShell,
  formatBookingDate,
  secondaryClass,
} from "@/features/merchants/bookings/components/BookingPrimitives";
import { getBookingCopy } from "@/features/merchants/bookings/copy";
import { getResidencyOwnerCopy } from "@/features/merchants/residency/ownerCopy";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getMerchantProfile } from "@/features/merchants/queries/getMerchantProfile";
import { getPublicResidencySlot } from "@/features/merchants/residency/queries";

export const dynamic = "force-dynamic";

export default async function MerchantResidencyDateRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; merchantId: string; slotId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ locale, merchantId, slotId }, { from }] = await Promise.all([
    params,
    searchParams,
  ]);
  const viewer = await getOptionalCurrentUserProfileSnapshot();
  const slot = await getPublicResidencySlot(slotId, viewer?.id);
  if (
    !slot ||
    (slot.merchant.id !== merchantId && slot.merchant.slug !== merchantId)
  ) {
    notFound();
  }
  const merchant = await getMerchantProfile(merchantId);
  const canViewCancelledDate =
    slot.status === "CANCELLED" &&
    (slot.viewerHadSignup || slot.viewerRequested);
  const canViewInactiveBookedDate =
    (slot.status === "CONFIRMED" || slot.status === "PUBLISHED") &&
    slot.viewerHadSignup;
  if (
    (!merchant && !canViewCancelledDate && !canViewInactiveBookedDate) ||
    (merchant && merchant.id !== slot.merchant.id)
  ) {
    notFound();
  }
  const copy = getBookingCopy(locale);
  const legacyCopy = getResidencyOwnerCopy(locale);

  return (
    <BookingShell>
      <BookingHeader
        backHref={
          from === "profile-bookings"
            ? "/profile/bookings"
            : `/merchants/${slot.merchant.id}`
        }
        locale={locale}
        title={copy.legacy}
      />
      <article className="pt-8">
        <h2 className="text-2xl font-bold text-forest">{slot.title}</h2>
        <p className="mt-3 text-sm font-semibold">
          {formatBookingDate(slot.date, locale)}
        </p>
        <p className="mt-2 text-sm text-ink/70">{slot.merchant.name}</p>
        <p className="mt-3 text-sm font-semibold text-ink/70">
          {legacyCopy.status[slot.status]}
        </p>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-ink/75">
          {slot.description}
        </p>
        {slot.activityId ? (
          <Link
            className={`${secondaryClass} mt-6`}
            href={getLocalizedActivityDetailPath(locale, slot.activityId)}
          >
            {copy.backLobby}
          </Link>
        ) : null}
        <Link
          className="mt-6 flex min-h-11 items-center text-sm font-semibold text-forest"
          href={withLocale(locale, "/profile/bookings")}
        >
          {copy.myBookings}
        </Link>
      </article>
    </BookingShell>
  );
}
