import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { withLocale } from "@/lib/routes";
import type { PublicBookingSpace } from "../types";
import { getBookingCopy } from "../copy";
import {
  BookingHeader,
  BookingShell,
  secondaryClass,
} from "./BookingPrimitives";
import { CustomerBookingForm } from "./CustomerBookingForm";

export function PersistentBookingPage({
  data,
  locale,
  isAuthenticated,
  signInHref,
  isMerchantOwner = false,
  viewerName,
}: {
  data: PublicBookingSpace;
  locale: string;
  isAuthenticated: boolean;
  signInHref: string;
  isMerchantOwner?: boolean;
  viewerName?: string;
}) {
  const copy = getBookingCopy(locale);
  const cover = data.settings.coverImageUrl || data.merchant.logoUrl;
  return (
    <BookingShell>
      <BookingHeader
        backHref="/lobby"
        backLabel={copy.backLobby}
        locale={locale}
        title={copy.permanent}
      />
      <article className="pt-6">
        <div className="flex items-start gap-4">
          {cover ? (
            <img
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24"
              src={cover}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-2xl font-bold leading-tight tracking-tight text-forest">
              {data.settings.title}
            </h2>
            {data.settings.title.trim() !== data.merchant.name.trim() ? (
              <p className="mt-2 text-sm font-semibold">{data.merchant.name}</p>
            ) : null}
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink/70">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {[data.merchant.city, data.merchant.address]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        {data.settings.description ? (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-ink/75">
            {data.settings.description}
          </p>
        ) : null}
      </article>
      {isMerchantOwner ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-fog px-4 py-3">
          <p className="text-sm text-ink/70">{copy.ownerHint}</p>
          <Link
            className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-forest"
            href={withLocale(locale, "/profile/store/bookings")}
          >
            {copy.manage}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
      <div className="mt-9">
        {data.canBook ? (
          <CustomerBookingForm
            data={data}
            isAuthenticated={isAuthenticated}
            locale={locale}
            signInHref={signInHref}
            viewerName={viewerName}
          />
        ) : (
          <section className="rounded-2xl bg-fog px-5 py-7">
            <h2 className="text-lg font-bold">{copy.paused}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              {copy.pausedHint}
            </p>
          </section>
        )}
      </div>
      {isAuthenticated ? (
        <Link
          className={`${secondaryClass} mt-8 w-full`}
          href={withLocale(locale, "/profile/bookings")}
        >
          {copy.myBookings}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : null}
    </BookingShell>
  );
}
