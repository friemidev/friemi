import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Plus,
  Users,
} from "lucide-react";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getResidencyOwnerCopy } from "@/features/merchants/residency/ownerCopy";
import type {
  ResidencySlotDetail,
  ResidencySlotSummary,
} from "@/features/merchants/residency/queries";
import { withLocale } from "@/lib/routes";
import { formatResidencyDate } from "./ResidencyCalendar";
import {
  ResidencyCancelForm,
  ResidencyPublishForm,
  ResidencyRequestForm,
} from "./OwnerResidencyForms";

function Header({
  backHref,
  backLabel,
  locale,
  title,
}: {
  backHref: string;
  backLabel: string;
  locale: string;
  title: string;
}) {
  return (
    <header className="flex h-14 items-center gap-3">
      <Link
        aria-label={backLabel}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        href={withLocale(locale, backHref)}
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
      </Link>
      <h1 className="min-w-0 truncate text-base font-bold">{title}</h1>
    </header>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-mobile-page-shell [--app-mobile-page-top-gap:1.5rem] min-h-svh bg-white text-ink">
      <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">{children}</div>
    </main>
  );
}

function statusLabel(locale: string, status: string) {
  const labels = getResidencyOwnerCopy(locale).status;
  return labels[status as keyof typeof labels] ?? status;
}

function statusClass(status: string) {
  if (status === "CONFIRMED") return "bg-forest/10 text-forest";
  if (status === "PUBLISHED") return "bg-meadow/15 text-forest";
  if (status === "PENDING") return "bg-coral/30 text-ink";
  return "bg-fog text-ink/65";
}

export function OwnerResidencyOverview({
  locale,
  merchantName,
  slots,
}: {
  locale: string;
  merchantName: string;
  slots: ResidencySlotSummary[];
}) {
  const copy = getResidencyOwnerCopy(locale);
  const ordered = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Shell>
      <Header
        backHref="/profile/store"
        backLabel={copy.backStore}
        locale={locale}
        title={copy.title}
      />
      <section className="pt-7">
        <h2 className="text-xl font-bold tracking-tight text-forest">
          {merchantName}
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-ink/65">
          {copy.description}
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, "/profile/store/bookings/new")}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {copy.requestDate}
        </Link>
      </section>
      <section aria-label={copy.title} className="pt-9">
        {ordered.length ? (
          <ol className="space-y-2">
            {ordered.map((slot) => (
              <li key={slot.id}>
                <Link
                  className="group flex min-h-20 items-center gap-4 rounded-2xl bg-fog/70 px-4 py-3 transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                  href={withLocale(
                    locale,
                    `/profile/store/bookings/${slot.id}`,
                  )}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-forest">
                    <CalendarDays aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold sm:text-base">
                      {slot.title}
                    </span>
                    <span className="mt-1 block text-xs text-ink/65 sm:text-sm">
                      {formatResidencyDate(slot.date, locale)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span
                        className={`rounded-full px-2.5 py-1 ${statusClass(slot.status)}`}
                      >
                        {statusLabel(locale, slot.status)}
                      </span>
                      {slot.status === "CONFIRMED" ||
                      slot.status === "PUBLISHED" ? (
                        <span className="text-ink/60">
                          {copy.signups(slot.signupCount)}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-forest"
                  />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl bg-fog/70 px-5 py-9 text-center text-sm text-ink/65">
            {copy.empty}
          </p>
        )}
      </section>
    </Shell>
  );
}

export function OwnerResidencyNew({
  initialDate,
  locale,
}: {
  initialDate?: string;
  locale: string;
}) {
  const copy = getResidencyOwnerCopy(locale);
  return (
    <Shell>
      <Header
        backHref="/profile/store/bookings"
        backLabel={copy.backReservations}
        locale={locale}
        title={copy.requestTitle}
      />
      <ResidencyRequestForm initialDate={initialDate} locale={locale} />
    </Shell>
  );
}

export function OwnerResidencyDetail({
  locale,
  slot,
}: {
  locale: string;
  slot: ResidencySlotDetail;
}) {
  const copy = getResidencyOwnerCopy(locale);
  const canCancel = slot.status === "PENDING" || slot.status === "CONFIRMED";
  return (
    <Shell>
      <Header
        backHref="/profile/store/bookings"
        backLabel={copy.backReservations}
        locale={locale}
        title={copy.title}
      />
      <article className="pt-8">
        <span
          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(slot.status)}`}
        >
          {statusLabel(locale, slot.status)}
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{slot.title}</h2>
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
        {slot.status === "CONFIRMED" ? (
          <Link
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-6 text-sm font-bold text-white"
            href={withLocale(
              locale,
              `/profile/store/bookings/${slot.id}/publish`,
            )}
          >
            {copy.createActivity}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
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
        {slot.status === "REJECTED" ? (
          <Link
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-6 text-sm font-bold text-white"
            href={withLocale(
              locale,
              `/profile/store/bookings/new?date=${slot.date}`,
            )}
          >
            {copy.reapply}
          </Link>
        ) : null}
      </article>
      {slot.status === "CONFIRMED" || slot.status === "PUBLISHED" ? (
        <section className="pt-10">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Users aria-hidden="true" className="h-5 w-5 text-forest" />
            {slot.status === "PUBLISHED"
              ? copy.originalSignupList
              : copy.signupList}{" "}
            · {slot.signupCount}
          </h3>
          {slot.signups.some((signup) => signup.status === "ACTIVE") ? (
            <ol className="mt-4 divide-y divide-fog">
              {slot.signups
                .filter((signup) => signup.status === "ACTIVE")
                .map((signup) => (
                  <li
                    className="flex min-h-14 items-center justify-between gap-3 py-3 text-sm"
                    key={signup.id}
                  >
                    <span className="font-semibold">{signup.nickname}</span>
                    <time
                      className="shrink-0 text-xs text-ink/55"
                      dateTime={signup.createdAt.toISOString()}
                    >
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(signup.createdAt)}
                    </time>
                  </li>
                ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-ink/65">{copy.noSignups}</p>
          )}
        </section>
      ) : null}
      {canCancel ? (
        <ResidencyCancelForm locale={locale} slotId={slot.id} />
      ) : null}
    </Shell>
  );
}

export function OwnerResidencyPublish({
  locale,
  slot,
}: {
  locale: string;
  slot: ResidencySlotDetail;
}) {
  const copy = getResidencyOwnerCopy(locale);
  return (
    <Shell>
      <Header
        backHref={`/profile/store/bookings/${slot.id}`}
        backLabel={copy.backReservations}
        locale={locale}
        title={copy.publishTitle}
      />
      <section className="pt-8">
        <p className="text-sm font-bold text-forest">
          {formatResidencyDate(slot.date, locale)}
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">{slot.title}</h2>
        <p className="mt-4 text-sm leading-6 text-ink/65">
          {copy.publishDescription}
        </p>
        <p className="mt-3 text-sm font-semibold text-ink/75">
          {copy.signups(slot.signupCount)}
        </p>
      </section>
      <ResidencyPublishForm
        initialAddress={slot.merchant.address ?? ""}
        locale={locale}
        slotId={slot.id}
      />
    </Shell>
  );
}
