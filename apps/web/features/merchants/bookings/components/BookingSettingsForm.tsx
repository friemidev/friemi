"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityCoverUpload } from "@/features/activities/components/ActivityCoverUpload";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { saveBookingSettingsAction } from "../actions";
import { getBookingCopy } from "../copy";
import type {
  BookingActionState,
  BookingMerchant,
  BookingScheduleMode,
  BookingSettingsView,
} from "../types";
import { getBookingToday } from "../validation";
import {
  formatBookingDate,
  inputClass,
  primaryClass,
  secondaryClass,
} from "./BookingPrimitives";

function DateCollection({
  name,
  initialDates,
  locale,
  min,
}: {
  name: string;
  initialDates: string[];
  locale: string;
  min: string;
}) {
  const copy = getBookingCopy(locale);
  const [dates, setDates] = useState(initialDates);
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          aria-label={
            name === "specificDates" ? copy.pickDates : copy.closedDates
          }
          className={`${inputClass} min-w-0 flex-1 basis-40`}
          lang={locale}
          min={min}
          onChange={(event) => setDraft(event.target.value)}
          type="date"
          value={draft}
        />
        <button
          className={secondaryClass}
          disabled={!draft || draft < min}
          onClick={() => {
            if (draft && !dates.includes(draft))
              setDates([...dates, draft].sort());
            setDraft("");
          }}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {copy.addDate}
        </button>
      </div>
      {dates.length ? (
        <ul className="divide-y divide-fog">
          {dates.map((date) => (
            <li
              className="flex min-h-12 items-center justify-between gap-3 py-1"
              key={date}
            >
              <input name={name} type="hidden" value={date} />
              <span className="text-sm">{formatBookingDate(date, locale)}</span>
              <button
                aria-label={`${copy.removeDate} ${date}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 focus-visible:outline-2 focus-visible:outline-forest"
                onClick={() =>
                  setDates(dates.filter((value) => value !== date))
                }
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink/70">{copy.noDates}</p>
      )}
    </div>
  );
}

export function BookingSettingsForm({
  locale,
  settings,
  merchant,
}: {
  locale: string;
  settings: BookingSettingsView | null;
  merchant: BookingMerchant;
}) {
  const copy = getBookingCopy(locale);
  const router = useRouter();
  const [mode, setMode] = useState<BookingScheduleMode>(
    settings?.scheduleMode ?? "WEEKLY",
  );
  const [startDate, setStartDate] = useState(
    settings?.startDate ?? getBookingToday(),
  );
  const [uploading, setUploading] = useState(false);
  const [state, action, pending] = useActionState(
    saveBookingSettingsAction,
    {} as BookingActionState,
  );
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-10 pt-8">
      <input name="locale" type="hidden" value={locale} />
      <section className="space-y-5">
        <h2 className="text-lg font-bold">{copy.identity}</h2>
        <div className="grid gap-2">
          <label className="text-sm font-semibold" htmlFor="booking-title">
            {copy.title}
          </label>
          <input
            className={inputClass}
            defaultValue={settings?.title ?? merchant.name}
            id="booking-title"
            maxLength={120}
            minLength={2}
            name="title"
            placeholder={copy.titlePlaceholder}
            required
          />
        </div>
        <div className="grid gap-2">
          <label
            className="text-sm font-semibold"
            htmlFor="booking-description"
          >
            {copy.description}{" "}
            <span className="font-normal text-ink/65">· {copy.optional}</span>
          </label>
          <textarea
            className={`${inputClass} min-h-28 py-3`}
            defaultValue={settings?.description ?? ""}
            id="booking-description"
            maxLength={2000}
            name="description"
            placeholder={copy.descriptionPlaceholder}
          />
        </div>
        <ActivityCoverUpload
          buttonOnlyUntilUploaded
          fallbackPreviewUrl={merchant.logoUrl}
          initialUrl={settings?.coverImageUrl}
          label={copy.cover}
          locale={locale}
          onUploadingChange={setUploading}
        />
      </section>
      <section className="space-y-5">
        <h2 className="text-lg font-bold">{copy.availability}</h2>
        <fieldset>
          <legend className="sr-only">{copy.availability}</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-fog p-1">
            {(
              [
                ["DAILY", copy.daily],
                ["WEEKLY", copy.weekly],
                ["DATES", copy.dates],
              ] as const
            ).map(([value, label]) => (
              <label
                className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${mode === value ? "bg-white text-forest" : "text-ink/70"}`}
                key={value}
              >
                <input
                  checked={mode === value}
                  className="sr-only"
                  name="scheduleMode"
                  onChange={() => setMode(value)}
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {mode === "WEEKLY" ? (
          <fieldset>
            <legend className="sr-only">{copy.weekly}</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label
                  className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-fog px-2 text-sm font-semibold text-ink/75 has-[:checked]:bg-forest has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest"
                  key={day}
                >
                  <input
                    className="sr-only"
                    defaultChecked={
                      settings?.weekdays.includes(day) ?? [5, 6].includes(day)
                    }
                    name="weekdays"
                    type="checkbox"
                    value={day}
                  />
                  {copy.weekdays[day]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid content-start gap-2">
            <label className="text-sm font-semibold" htmlFor="booking-start">
              {copy.startDate}
            </label>
            <input
              className={inputClass}
              id="booking-start"
              lang={locale}
              name="startDate"
              onChange={(event) => setStartDate(event.target.value)}
              required
              type="date"
              value={startDate}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold" htmlFor="booking-end">
              {copy.endDate}{" "}
              <span className="font-normal text-ink/65">· {copy.optional}</span>
            </label>
            <input
              className={inputClass}
              defaultValue={settings?.endDate ?? ""}
              id="booking-end"
              lang={locale}
              min={startDate}
              name="endDate"
              type="date"
            />
            <p className="text-xs leading-5 text-ink/70">{copy.noEnd}</p>
          </div>
        </div>
        {mode === "DATES" ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{copy.pickDates}</p>
            <DateCollection
              initialDates={settings?.specificDates ?? []}
              locale={locale}
              min={startDate}
              name="specificDates"
            />
          </div>
        ) : null}
        <details className="pt-1">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-forest">
            {copy.closedDates}
          </summary>
          <div className="space-y-3 pt-2">
            <p className="text-sm leading-6 text-ink/70">
              {copy.exceptionsHint}
            </p>
            <DateCollection
              initialDates={settings?.closedDates ?? []}
              locale={locale}
              min={startDate}
              name="closedDates"
            />
          </div>
        </details>
      </section>
      {settings ? (
        <label className="flex min-h-16 cursor-pointer items-start gap-3">
          <input
            className="mt-1 h-5 w-5 accent-forest"
            defaultChecked={settings.enabled}
            name="enabled"
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-bold">{copy.enabled}</span>
            <span className="mt-1 block text-sm leading-6 text-ink/70">
              {copy.enabledHint}
            </span>
          </span>
        </label>
      ) : (
        <input name="enabled" type="hidden" value="true" />
      )}
      <div className="space-y-4">
        {state.error ? (
          <p className="text-sm font-semibold text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <div className="space-y-2" role="status">
            <p className="text-sm font-bold text-forest">{copy.saved}</p>
            {state.activityId ? (
              <Link
                className="inline-flex min-h-11 items-center text-sm font-bold text-forest underline underline-offset-4"
                href={getLocalizedActivityDetailPath(locale, state.activityId)}
              >
                {copy.viewSpace}
              </Link>
            ) : null}
          </div>
        ) : null}
        <button
          className={`${primaryClass} w-full sm:w-auto`}
          disabled={pending || uploading}
          type="submit"
        >
          {pending ? copy.saving : settings ? copy.save : copy.create}
        </button>
      </div>
    </form>
  );
}
