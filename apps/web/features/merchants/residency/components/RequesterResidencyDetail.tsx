import Link from "next/link";
import React from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getResidencyOwnerCopy } from "../ownerCopy";
import type { ResidencySlotSummary } from "../queries";
import {
  BookingHeader,
  BookingShell,
  primaryClass,
} from "@/features/merchants/bookings/components/BookingPrimitives";
import { formatResidencyDate } from "./ResidencyCalendar";

/** A former store owner may inspect their own application, but not its attendees. */
export function RequesterResidencyDetail({
  locale,
  slot,
  backHref = "/profile",
}: {
  locale: string;
  slot: ResidencySlotSummary;
  backHref?: string;
}) {
  const copy = getResidencyOwnerCopy(locale);
  const statusClass =
    slot.status === "CONFIRMED"
      ? "bg-forest/10 text-forest"
      : slot.status === "PUBLISHED"
        ? "bg-meadow/15 text-forest"
        : slot.status === "PENDING"
          ? "bg-coral/30 text-ink"
          : "bg-fog text-ink/65";

  return (
    <BookingShell>
      <BookingHeader
        backHref={backHref}
        backLabel={backHref === "/profile" ? copy.backProfile : undefined}
        locale={locale}
        title={copy.requestHistory}
      />
      <article className="pt-5">
        <div className="rounded-2xl bg-fog p-5">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusClass}`}
          >
            {copy.status[slot.status]}
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">
            {slot.title}
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-forest">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {formatResidencyDate(slot.date, locale)}
          </p>
          <p className="mt-3 break-words text-sm text-ink/70">
            {slot.merchant.name}
          </p>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-ink/75">
          {slot.description}
        </p>
        {slot.status === "REJECTED" && slot.rejectionReason ? (
          <div className="mt-6 rounded-2xl bg-fog px-5 py-4">
            <p className="text-xs font-bold text-ink/60">
              {copy.rejectedReason}
            </p>
            <p className="mt-2 text-sm leading-6">{slot.rejectionReason}</p>
          </div>
        ) : null}
        {slot.status === "PUBLISHED" && slot.activityId ? (
          <Link
            className={`${primaryClass} mt-6 w-full sm:w-auto`}
            href={getLocalizedActivityDetailPath(locale, slot.activityId)}
          >
            {copy.viewActivity}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </article>
      <p className="mt-10 text-sm leading-6 text-ink/65">
        {copy.readOnlyRequest}
      </p>
    </BookingShell>
  );
}
