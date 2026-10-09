import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getBookingCopy } from "../copy";

export const inputClass =
  "min-h-12 w-full rounded-xl bg-fog px-4 text-base text-ink placeholder:text-ink/60 outline-none focus-visible:ring-2 focus-visible:ring-forest";
export const primaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";
export const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-fog px-4 text-sm font-semibold text-forest transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

export function BookingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink selection:bg-meadow/20 selection:text-forest">
      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">{children}</div>
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
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        href={withLocale(locale, backHref)}
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
      </Link>
      <h1 className="min-w-0 flex-1 text-base font-bold leading-snug">
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
