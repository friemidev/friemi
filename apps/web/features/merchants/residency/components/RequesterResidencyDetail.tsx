import Link from "next/link";
import React from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays } from "lucide-react";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getResidencyOwnerCopy } from "../ownerCopy";
import type { ResidencySlotSummary } from "../queries";
import { withLocale } from "@/lib/routes";
import { formatResidencyDate } from "./ResidencyCalendar";

/** A former store owner may inspect their own application, but not its attendees. */
export function RequesterResidencyDetail({
  locale,
  slot,
}: {
  locale: string;
  slot: ResidencySlotSummary;
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
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <header className="flex h-14 items-center gap-3">
          <Link
            aria-label={copy.backProfile}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/profile")}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 truncate text-base font-bold">
            {copy.requestHistory}
          </h1>
        </header>
        <article className="pt-8">
          <p className="mb-3 text-sm font-semibold text-forest">
            {slot.merchant.name}
          </p>
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
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-6 text-sm font-bold text-white"
              href={getLocalizedActivityDetailPath(locale, slot.activityId)}
            >
              {copy.viewActivity}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </article>
        <p className="mt-10 text-sm leading-6 text-ink/65">
          {copy.readOnlyRequest}
        </p>
      </div>
    </main>
  );
}
