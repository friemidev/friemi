import Link from "next/link";
import React from "react";
import { ArrowLeft } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getBookingCopy } from "../copy";

export const inputClass =
  "min-h-12 w-full rounded-xl bg-fog px-4 text-base text-ink placeholder:text-ink/60 caret-forest outline-none focus-visible:ring-2 focus-visible:ring-forest";
export const primaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
export const secondaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-fog px-4 py-3 text-center text-sm font-semibold text-forest transition-colors hover:bg-sand/30 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
export const dangerClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-center text-sm font-semibold text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";
export const dangerPrimaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger";

export function BookingShell({
  children,
  embedded = false,
}: {
  children: React.ReactNode;
  embedded?: boolean;
}) {
  return (
    <main
      className={
        embedded
          ? "booking-embedded-page min-h-full bg-white text-ink selection:bg-meadow/20 selection:text-forest"
          : "app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink selection:bg-meadow/20 selection:text-forest"
      }
    >
      <div
        className={
          embedded
            ? "mx-auto max-w-3xl px-5 pb-8 sm:px-6"
            : "mx-auto max-w-3xl px-4 pb-12 sm:px-6 md:pt-8"
        }
      >
        {children}
      </div>
    </main>
  );
}

export function BookingHeader({
  locale,
  title,
  backHref,
  backLabel,
  action,
}: {
  locale: string;
  title: string;
  backHref: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center gap-3">
      <Link
        aria-label={backLabel ?? getBookingCopy(locale).back}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition-colors hover:bg-sand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        href={withLocale(locale, backHref)}
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
      </Link>
      <h1 className="min-w-0 flex-1 text-lg font-bold leading-snug">
        {title}
      </h1>
      {action}
    </header>
  );
}

export function formatBookingDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}

export function BookingStatus({
  status,
  locale,
}: {
  status: string;
  locale: string;
}) {
  const copy = getBookingCopy(locale);
  const color =
    status === "PENDING"
      ? "bg-coral/25 text-ink"
      : status === "ACCEPTED"
        ? "bg-meadow/15 text-forest"
        : "bg-fog text-ink/70";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${color}`}
    >
      {copy.status[status as keyof typeof copy.status] ?? status}
    </span>
  );
}
