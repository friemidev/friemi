import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";
import { InventoryItemArtwork } from "./InventoryItemArtwork";
import { getTicketWorkbenchCopy } from "../ticketWorkbenchCopy";
import { withLocale } from "@/lib/routes";

export function TicketWorkbenchLayout({
  backPath,
  children,
  locale,
  title,
}: {
  backPath: string;
  children: React.ReactNode;
  locale: string;
  title: string;
}) {
  const copy = getTicketWorkbenchCopy(locale);

  return (
    <main className="app-mobile-page-shell mx-auto w-full max-w-4xl px-4 [--app-mobile-page-top-gap:1.5rem] sm:px-6 md:min-h-0 md:pb-16 md:pt-10">
      <header className="flex min-w-0 items-center gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-forest transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, backPath)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 break-words text-xl font-bold leading-tight text-ink sm:text-2xl">
          {title}
        </h1>
      </header>
      <div className="mt-7">{children}</div>
    </main>
  );
}

export function TicketWorkbenchArtwork({
  imageUrl,
  title,
  locale,
  className = "h-16 w-16 rounded-xl",
}: {
  imageUrl: string | null;
  title: string;
  locale: string;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <InventoryItemArtwork
        alt={getTicketWorkbenchCopy(locale).ticketImage(title)}
        className={className}
        fit="contain"
        imageUrl={imageUrl}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center bg-fog text-forest ${className}`}
    >
      <Ticket aria-hidden="true" className="h-7 w-7" />
    </span>
  );
}
