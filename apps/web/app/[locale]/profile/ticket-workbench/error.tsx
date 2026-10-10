"use client";

import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";
import { withLocale } from "@/lib/routes";

export default function TicketWorkbenchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const copy = getTicketWorkbenchCopy(locale);

  return (
    <main className="app-mobile-page-shell mx-auto w-full max-w-4xl px-4 [--app-mobile-page-top-gap:1.5rem] sm:px-6 md:min-h-0 md:pb-16 md:pt-10">
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest"
        href={withLocale(locale, "/profile")}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {copy.back}
      </Link>
      <div className="mt-10 max-w-lg rounded-2xl bg-fog/70 p-6">
        <CircleAlert aria-hidden="true" className="h-7 w-7 text-danger" />
        <h1 className="mt-4 text-xl font-bold text-ink">{copy.loadFailed}</h1>
        <p className="mt-2 text-sm text-ink/70">{copy.loadFailedHint}</p>
        <button
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-5 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          onClick={reset}
          type="button"
        >
          {copy.retry}
        </button>
      </div>
    </main>
  );
}
