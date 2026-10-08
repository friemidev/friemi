"use client";

import { useParams } from "next/navigation";
import { getTicketWorkbenchCopy } from "@/features/inventory/ticketWorkbenchCopy";

export default function TicketWorkbenchLoading() {
  const params = useParams<{ locale: string }>();
  const copy = getTicketWorkbenchCopy(params.locale);

  return (
    <main
      aria-busy="true"
      aria-label={copy.loading}
      className="app-mobile-page-shell mx-auto w-full max-w-4xl px-4 [--app-mobile-page-top-gap:1.5rem] sm:px-6 md:min-h-0 md:pb-16 md:pt-10"
      role="status"
    >
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-fog" />
        <div className="h-6 w-40 rounded-lg bg-fog" />
      </div>
      <div className="mt-8 h-4 w-32 rounded-lg bg-fog" />
      <div className="mt-4 space-y-3">
        <div className="h-20 rounded-2xl bg-fog/70" />
        <div className="h-20 rounded-2xl bg-fog/70" />
      </div>
    </main>
  );
}
