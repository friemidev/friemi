import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getPublicResidencyCopy } from "../publicCopy";
import { getParisDateString } from "../validation";
import { withLocale } from "@/lib/routes";

export type ResidencyCalendarSlot = {
  id: string;
  date: string;
  title: string;
  status?: string;
  signupCount?: number;
};

type ResidencyCalendarProps = {
  basePath: string;
  emptyTitle?: string;
  listTitle?: string;
  locale: string;
  month?: string;
  slots: ResidencyCalendarSlot[];
};

const monthPattern = /^(20\d{2})-(0[1-9]|1[0-2])$/;

export function normalizeResidencyMonth(month?: string) {
  if (month && monthPattern.test(month)) return month;
  return getParisDateString().slice(0, 7);
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatResidencyDate(
  date: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    ...options,
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function ResidencyCalendar({
  basePath,
  emptyTitle,
  listTitle,
  locale,
  month,
  slots,
}: ResidencyCalendarProps) {
  const copy = getPublicResidencyCopy(locale);
  const visibleMonth = normalizeResidencyMonth(month);
  const [year, monthNumber] = visibleMonth.split("-").map(Number);
  const firstWeekday =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const visibleSlots = slots
    .filter((slot) => slot.date.startsWith(`${visibleMonth}-`))
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        Number(left.status === "CANCELLED") -
          Number(right.status === "CANCELLED") ||
        left.id.localeCompare(right.id),
    );
  const slotsByDate = new Map<string, ResidencyCalendarSlot[]>();
  for (const slot of visibleSlots) {
    const current = slotsByDate.get(slot.date) ?? [];
    current.push(slot);
    slotsByDate.set(slot.date, current);
  }
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const monthHref = (targetMonth: string) =>
    withLocale(locale, `${basePath}?month=${targetMonth}`);

  return (
    <section aria-label={copy.calendar} className="space-y-7">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Link
            aria-label={copy.previousMonth}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={monthHref(shiftMonth(visibleMonth, -1))}
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h2 className="text-lg font-bold tracking-tight text-ink sm:text-xl">
            {monthLabel}
          </h2>
          <Link
            aria-label={copy.nextMonth}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={monthHref(shiftMonth(visibleMonth, 1))}
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-7 text-center">
          {copy.weekdays.map((weekday, index) => (
            <span
              className="py-2 text-xs font-semibold text-ink/60"
              key={`${weekday}-${index}`}
            >
              {weekday}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstWeekday }, (_, index) => (
            <span aria-hidden="true" key={`blank-${index}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const date = `${visibleMonth}-${String(day).padStart(2, "0")}`;
            const daySlots = slotsByDate.get(date) ?? [];
            const slot =
              daySlots.find((item) => item.status !== "CANCELLED") ??
              daySlots[0];
            const dayLabel = formatResidencyDate(date, locale);
            return slot ? (
              <Link
                aria-label={`${dayLabel} · ${daySlots.map((item) => `${item.title}${item.status === "CANCELLED" ? `（${copy.cancelledDate}）` : ""}`).join("、")}`}
                className={`mx-auto flex min-h-12 w-full max-w-16 flex-col items-center justify-center gap-1 rounded-xl transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${slot.status === "CANCELLED" ? "bg-fog text-ink/65" : "bg-forest text-paper"}`}
                href={withLocale(locale, `${basePath}/${slot.id}`)}
                key={date}
              >
                <span className="text-sm font-bold tabular-nums">{day}</span>
                <span
                  aria-hidden="true"
                  className={`h-1 w-1 rounded-full ${slot.status === "CANCELLED" ? "bg-ink/50" : "bg-paper/90"}`}
                />
              </Link>
            ) : (
              <span
                aria-label={dayLabel}
                className="mx-auto flex min-h-12 w-full max-w-16 items-center justify-center text-sm tabular-nums text-ink/45"
                key={date}
              >
                {day}
              </span>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">
          {listTitle ?? copy.monthDates}
        </h3>
        {visibleSlots.length ? (
          <ol className="mt-4 space-y-2">
            {visibleSlots.map((slot) => {
              const isCancelled = slot.status === "CANCELLED";
              return (
                <li key={slot.id}>
                  <Link
                    aria-label={`${copy.viewDate}：${slot.title}${isCancelled ? `（${copy.cancelledDate}）` : ""}`}
                    className="group flex min-h-20 items-center gap-4 rounded-2xl bg-fog/70 px-4 py-3 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                    href={withLocale(locale, `${basePath}/${slot.id}`)}
                  >
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-paper text-forest">
                      <span className="text-lg font-bold leading-none tabular-nums">
                        {Number(slot.date.slice(-2))}
                      </span>
                      <span className="mt-0.5 text-[10px] font-semibold tabular-nums">
                        {String(monthNumber).padStart(2, "0")}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-bold leading-5 text-ink sm:text-base">
                        {slot.title}
                      </span>
                      {isCancelled ? (
                        <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink/70">
                          {copy.cancelledDate}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-xs text-ink/65 sm:text-sm">
                        {formatResidencyDate(slot.date, locale)}
                        {!isCancelled && typeof slot.signupCount === "number"
                          ? ` · ${slot.status === "PUBLISHED" ? copy.reservationParticipants(slot.signupCount) : copy.participants(slot.signupCount)}`
                          : ""}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-forest transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-2xl bg-fog/70 px-5 py-8 text-sm text-ink/70">
            {emptyTitle ?? copy.empty}
          </p>
        )}
      </div>
    </section>
  );
}
