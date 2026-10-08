import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  History,
  ScanLine,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import { getMerchantTicketCopy } from "@/features/merchants/merchantTicketCopy";
import { withLocale } from "@/lib/routes";

type MerchantTicket = {
  id: string;
  title: string;
  imageUrl: string | null;
  totalSupply: number;
  issuedCount: number;
  redeemedCount: number;
  activeStaffCount: number;
  pendingStaffCount: number;
};

export function MerchantTicketFrame({
  backHref,
  backLabel,
  children,
  locale,
  title,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  locale: string;
  title: string;
}) {
  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
      <div className="mx-auto w-full max-w-4xl px-4 pb-28 sm:px-6 md:pb-16">
        <header className="flex min-h-14 items-center gap-3">
          <Link
            aria-label={backLabel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, backHref)}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 text-base font-bold leading-6">{title}</h1>
        </header>
        {children}
      </div>
    </main>
  );
}

export function MerchantTicketList({
  locale,
  merchantName,
  tickets,
}: {
  locale: string;
  merchantName: string;
  tickets: MerchantTicket[];
}) {
  const copy = getMerchantTicketCopy(locale);

  return (
    <MerchantTicketFrame
      backHref="/profile/store"
      backLabel={copy.backToStore}
      locale={locale}
      title={copy.tickets}
    >
      <div className="pt-6 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {merchantName}
          </h2>
          <span className="text-sm tabular-nums text-ink/65">
            {copy.ticketTypeCount(tickets.length)}
          </span>
        </div>
        <p className="mt-2 text-sm text-ink/70">{copy.ticketsHint}</p>
      </div>

      {tickets.length ? (
        <ol className="mt-7 grid gap-2 md:grid-cols-2 md:gap-4">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                aria-label={`${copy.viewTicket}：${ticket.title}`}
                className="group flex min-h-28 items-center gap-4 rounded-2xl bg-fog/55 p-4 transition hover:bg-fog active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                href={withLocale(locale, `/profile/store/tickets/${ticket.id}`)}
              >
                <TicketImage imageUrl={ticket.imageUrl} title={ticket.title} />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-base font-bold leading-6">
                    {ticket.title}
                  </span>
                  <span className="mt-1 block text-sm text-ink/65">
                    {copy.redeemed} {ticket.redeemedCount}
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    {copy.activeStaff} {ticket.activeStaffCount}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-forest transition group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-8 rounded-2xl bg-fog/70 px-6 py-12 text-center">
          <TicketCheck aria-hidden="true" className="mx-auto h-7 w-7 text-forest" />
          <p className="mt-4 font-semibold">{copy.empty}</p>
          <p className="mt-1 text-sm text-ink/70">{copy.emptyHint}</p>
        </div>
      )}
    </MerchantTicketFrame>
  );
}

export function MerchantTicketDetail({
  locale,
  ticket,
}: {
  locale: string;
  ticket: MerchantTicket;
}) {
  const copy = getMerchantTicketCopy(locale);
  const base = `/profile/store/tickets/${ticket.id}`;

  return (
    <MerchantTicketFrame
      backHref="/profile/store/tickets"
      backLabel={copy.backToTickets}
      locale={locale}
      title={copy.backToTicket}
    >
      <section className="mt-6 rounded-2xl bg-forest px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <TicketImage imageUrl={ticket.imageUrl} title={ticket.title} large />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/70">{copy.tickets}</p>
            <h2 className="mt-1 break-words text-xl font-bold leading-tight sm:text-2xl">
              {ticket.title}
            </h2>
          </div>
        </div>
        <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
          <Metric label={copy.supply} value={ticket.totalSupply} />
          <Metric label={copy.issued} value={ticket.issuedCount} />
          <Metric label={copy.redeemed} value={ticket.redeemedCount} />
          <Metric label={copy.activeStaff} value={ticket.activeStaffCount} />
        </dl>
      </section>

      <nav aria-label={ticket.title} className="mt-6 grid gap-2 sm:mt-8">
        <ActionRow
          description={copy.checkInHint}
          href={`/tickets/redeem?definitionId=${encodeURIComponent(ticket.id)}&source=store`}
          icon={<ScanLine aria-hidden="true" className="h-5 w-5" />}
          label={copy.checkIn}
          locale={locale}
          primary
        />
        <ActionRow
          description={copy.staffHint}
          href={`${base}/staff`}
          icon={<UsersRound aria-hidden="true" className="h-5 w-5" />}
          label={copy.staff}
          locale={locale}
          meta={ticket.pendingStaffCount ? `${ticket.pendingStaffCount} ${copy.pending}` : undefined}
        />
        <ActionRow
          description={copy.historyHint}
          href={`${base}/history`}
          icon={<History aria-hidden="true" className="h-5 w-5" />}
          label={copy.history}
          locale={locale}
        />
      </nav>
    </MerchantTicketFrame>
  );
}

export function MerchantTicketSubhead({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl bg-fog/70 p-3">
      <TicketImage imageUrl={imageUrl} title={title} />
      <p className="min-w-0 flex-1 break-words text-sm font-bold leading-6">
        {title}
      </p>
    </div>
  );
}

function TicketImage({
  imageUrl,
  large = false,
  title,
}: {
  imageUrl: string | null;
  large?: boolean;
  title: string;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-paper text-forest ${large ? "h-20 w-20 sm:h-24 sm:w-24" : "h-16 w-16"}`}
    >
      {imageUrl ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes={large ? "96px" : "64px"}
          src={imageUrl}
        />
      ) : (
        <TicketCheck aria-label={title} className="h-7 w-7" />
      )}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-white/70">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}

function ActionRow({
  description,
  href,
  icon,
  label,
  locale,
  meta,
  primary = false,
}: {
  description: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  locale: string;
  meta?: string;
  primary?: boolean;
}) {
  return (
    <Link
      className={`group flex min-h-20 items-center gap-4 rounded-2xl px-3 py-4 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${primary ? "bg-coral/55 hover:bg-coral/70" : "hover:bg-fog/70"}`}
      href={withLocale(locale, href)}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${primary ? "bg-forest text-white" : "bg-fog text-forest"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">{label}</span>
        <span className="mt-0.5 block text-sm text-ink/65">{description}</span>
        {meta ? (
          <span className="mt-1 block text-xs font-semibold text-forest">{meta}</span>
        ) : null}
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-forest transition group-hover:translate-x-0.5" />
    </Link>
  );
}
