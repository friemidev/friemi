import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  History,
  Settings2,
  Store,
} from "lucide-react";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";
import { getBookingCopy } from "../copy";
import type {
  BookingMerchant,
  BookingRecord,
  BookingSettingsView,
} from "../types";
import { getBookingToday } from "../validation";
import {
  BookingHeader,
  BookingShell,
  primaryClass,
  secondaryClass,
} from "./BookingPrimitives";
import { BookingList } from "./BookingList";
import { BookingAcceptanceControl } from "./BookingAcceptanceControl";
import { BookingSettingsForm } from "./BookingSettingsForm";

export function OwnerBookingDashboard({
  locale,
  merchant,
  settings,
  bookings,
  hasLegacy = false,
}: {
  locale: string;
  merchant: BookingMerchant;
  settings: BookingSettingsView | null;
  bookings: BookingRecord[];
  hasLegacy?: boolean;
}) {
  const copy = getBookingCopy(locale);
  return (
    <BookingShell>
      <BookingHeader
        backHref="/profile/store"
        backLabel={copy.backStore}
        locale={locale}
        title={copy.management}
      />
      <section className="pt-5">
        <div className="flex items-center gap-4 rounded-2xl bg-forest p-5 text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/15">
            {merchant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                src={merchant.logoUrl}
              />
            ) : (
              <Store aria-hidden="true" className="h-6 w-6" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-xl font-bold leading-snug">
              {merchant.name}
            </h2>
            {settings ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-white/90">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${settings.enabled ? "bg-white" : "bg-white/50"}`}
                />
                {settings.enabled ? copy.open : copy.paused}
              </p>
            ) : null}
          </div>
        </div>
        {settings ? (
          <>
            <nav
              className="mt-4 grid gap-3 sm:grid-cols-2"
              aria-label={copy.management}
            >
              <Link
                className={`${secondaryClass} min-h-14 justify-start`}
                href={withLocale(locale, "/profile/store/bookings/settings")}
              >
                <Settings2 aria-hidden="true" className="h-5 w-5" />
                <span className="flex-1 text-left">{copy.settings}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              {settings.enabled ? (
                <Link
                  className={`${secondaryClass} min-h-14 justify-start`}
                  href={getLocalizedActivityDetailPath(locale, settings.activityId)}
                >
                  <CalendarDays aria-hidden="true" className="h-5 w-5" />
                  <span className="flex-1 text-left">{copy.viewSpace}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : null}
            </nav>
            <BookingAcceptanceControl
              enabled={settings.enabled}
              locale={locale}
            />
          </>
        ) : (
          <div className="pt-6">
            <h3 className="text-lg font-bold">{copy.setupTitle}</h3>
            <p className="mt-3 max-w-lg text-sm leading-7 text-ink/70">
              {copy.setupHint}
            </p>
            <Link
              className={`${primaryClass} mt-6`}
              href={withLocale(locale, "/profile/store/bookings/settings")}
            >
              {copy.createSpace}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
      {settings ? (
        <section className="pt-8">
          <h2 className="mb-4 text-lg font-bold text-ink">{copy.records}</h2>
          <BookingList
            bookings={bookings}
            locale={locale}
            owner
            today={getBookingToday()}
          />
        </section>
      ) : null}
      {hasLegacy ? (
        <Link
          className={`${secondaryClass} mt-6 w-full justify-start`}
          href={withLocale(locale, "/profile/store/bookings/history")}
        >
          <History aria-hidden="true" className="h-5 w-5" />
          <span className="flex-1 text-left">{copy.legacy}</span>
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : null}
    </BookingShell>
  );
}

export function OwnerBookingSettings({
  locale,
  merchant,
  settings,
}: {
  locale: string;
  merchant: BookingMerchant;
  settings: BookingSettingsView | null;
}) {
  const copy = getBookingCopy(locale);
  return (
    <BookingShell>
      <BookingHeader
        backHref="/profile/store/bookings"
        backLabel={copy.backBookings}
        locale={locale}
        title={settings ? copy.settings : copy.createSpace}
      />
      <BookingSettingsForm
        locale={locale}
        merchant={merchant}
        settings={settings}
      />
    </BookingShell>
  );
}
