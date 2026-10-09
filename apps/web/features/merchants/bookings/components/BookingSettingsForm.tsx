"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
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
import { getBookingSettingsCopy } from "./settingsCopy";
import {
  formatBookingDate,
  inputClass,
  primaryClass,
  secondaryClass,
} from "./BookingPrimitives";

function DateCollection({
  name,
  dates,
  onDatesChange,
  locale,
  min,
  max,
}: {
  name: string;
  dates: string[];
  onDatesChange: (dates: string[]) => void;
  locale: string;
  min: string;
  max: string;
}) {
  const copy = getBookingCopy(locale);
  const [draft, setDraft] = useState("");
  const outsideRange = (date: string) =>
    date < min || Boolean(max && date > max);
  const hasInvalidDates = dates.some(outsideRange);
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
          max={max || undefined}
          onChange={(event) => setDraft(event.target.value)}
          type="date"
          value={draft}
        />
        <button
          className={secondaryClass}
          disabled={!draft || outsideRange(draft)}
          onClick={() => {
            if (draft && !dates.includes(draft))
              onDatesChange([...dates, draft].sort());
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
              <span className="text-sm">
                {formatBookingDate(date, locale)}
                {outsideRange(date) ? (
                  <span className="mt-1 block text-xs font-semibold text-danger">
                    {copy.outsideRange}
                  </span>
                ) : null}
              </span>
              <button
                aria-label={`${copy.removeDate} ${date}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink/70 focus-visible:outline-2 focus-visible:outline-forest"
                onClick={() =>
                  onDatesChange(dates.filter((value) => value !== date))
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
      {hasInvalidDates ? (
        <p className="text-sm leading-6 text-danger" role="alert">
          {copy.dateRangeHint}
        </p>
      ) : null}
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
  const flow = getBookingSettingsCopy(locale);
  const [step, setStep] = useState<0 | 1>(settings ? 1 : 0);
  const titleInput = useRef<HTMLInputElement>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const lastStep = useRef(step);
  const [identityError, setIdentityError] = useState("");
  const [mode, setMode] = useState<BookingScheduleMode>(
    settings?.scheduleMode ?? "WEEKLY",
  );
  const [startDate, setStartDate] = useState(
    settings?.startDate ?? getBookingToday(),
  );
  const [endDate, setEndDate] = useState(settings?.endDate ?? "");
  const [title, setTitle] = useState(settings?.title ?? merchant.name);
  const [description, setDescription] = useState(settings?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    settings?.coverImageUrl ?? "",
  );
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [weekdays, setWeekdays] = useState(settings?.weekdays ?? [5, 6]);
  const [specificDates, setSpecificDates] = useState(
    settings?.specificDates ?? [],
  );
  const [closedDates, setClosedDates] = useState(settings?.closedDates ?? []);
  const [showErrors, setShowErrors] = useState(false);
  const [submittedValues, setSubmittedValues] = useState<string | null>(null);
  const outsideRange = (date: string) =>
    date < startDate || Boolean(endDate && date > endDate);
  const invalidClosedDates = closedDates.some(outsideRange);
  const invalidSpecificDates =
    mode === "DATES" && specificDates.some(outsideRange);
  const missingWeekdays = mode === "WEEKLY" && !weekdays.length;
  const missingDates = mode === "DATES" && !specificDates.length;
  const values = JSON.stringify({
    title,
    description,
    coverImageUrl,
    mode,
    startDate,
    endDate,
    weekdays,
    specificDates,
    closedDates,
    enabled,
  });
  const [uploading, setUploading] = useState(false);
  const [state, action, pending] = useActionState(
    saveBookingSettingsAction,
    {} as BookingActionState,
  );
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);
  useEffect(() => {
    if (lastStep.current !== step) panelHeading.current?.focus();
    lastStep.current = step;
  }, [step]);

  function changeStep(next: 0 | 1) {
    if (pending || uploading) return;
    if (next === 1 && step === 0) {
      if (title.trim().length < 2) {
        setIdentityError(flow.titleRequired);
        titleInput.current?.focus();
        return;
      }
      if (titleInput.current && !titleInput.current.reportValidity()) return;
    }
    setIdentityError("");
    setStep(next);
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-6 pt-4"
      onSubmit={(event) => {
        if (step === 0) {
          event.preventDefault();
          changeStep(1);
          return;
        }
        setShowErrors(true);
        if (
          missingWeekdays ||
          missingDates ||
          invalidClosedDates ||
          invalidSpecificDates
        ) {
          event.preventDefault();
          return;
        }
        setSubmittedValues(values);
      }}
    >
      <input name="locale" type="hidden" value={locale} />
      <nav aria-label={flow.steps} className="flex gap-5">
        {([copy.identity, copy.availability] as const).map((label, index) => (
          <button
            aria-current={step === index ? "step" : undefined}
            aria-label={label}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50 ${step === index ? "border-forest text-forest" : "border-transparent text-ink/70 hover:text-forest"}`}
            disabled={pending || uploading}
            key={label}
            onClick={() => changeStep(index as 0 | 1)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${step === index ? "bg-forest text-white" : "bg-fog text-ink/70"}`}
            >
              {index === 0 && step === 1 ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                index + 1
              )}
            </span>
            {label}
          </button>
        ))}
      </nav>
      <h2 className="sr-only" ref={panelHeading} tabIndex={-1}>
        {step === 0 ? copy.identity : copy.availability}
      </h2>
      {step === 0 ? (
        <section className="grid gap-6 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              {copy.cover}{" "}
              <span className="font-normal text-ink/70">· {copy.optional}</span>
            </span>
            <ActivityCoverUpload
              buttonOnlyUntilUploaded
              splitPreviewBelow
              initialUrl={coverImageUrl}
              label={copy.cover}
              locale={locale}
              onUploadingChange={setUploading}
              onChange={setCoverImageUrl}
              splitEmptyContainerClassName="text-ink"
              splitEmptyButtonClassName="h-28 sm:h-44 rounded-xl bg-fog text-forest shadow-none hover:bg-meadow/15 hover:text-forest focus-visible:outline-2 focus-visible:outline-forest"
              splitEmptyIconClassName="bg-white text-forest shadow-none"
              splitPreviewCardClassName="rounded-xl bg-fog shadow-none ring-0"
              splitPreviewClassName="w-full"
              splitPreviewButtonClassName="h-28 sm:h-44 bg-fog focus-visible:outline-2 focus-visible:outline-forest"
              splitRemoveButtonClassName="min-h-11 min-w-11 bg-ink/80 shadow-none backdrop-blur-none"
            />
            <p className="text-xs leading-5 text-ink/70">{flow.coverHint}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-semibold" htmlFor="booking-title">
                {copy.title}
              </label>
              <input
                className={inputClass}
                ref={titleInput}
                aria-invalid={Boolean(identityError)}
                aria-describedby={
                  identityError ? "booking-title-error" : undefined
                }
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setIdentityError("");
                }}
                id="booking-title"
                maxLength={120}
                minLength={2}
                name="title"
                placeholder={copy.titlePlaceholder}
                required
              />
              {identityError ? (
                <p
                  className="text-sm text-danger"
                  id="booking-title-error"
                  role="alert"
                >
                  {identityError}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold"
                htmlFor="booking-description"
              >
                {copy.description}{" "}
                <span className="font-normal text-ink/65">
                  · {copy.optional}
                </span>
              </label>
              <textarea
                className={`${inputClass} min-h-24 resize-y py-3`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                id="booking-description"
                maxLength={2000}
                name="description"
                placeholder={copy.descriptionPlaceholder}
              />
            </div>
          </div>
        </section>
      ) : (
        <>
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="description" value={description} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
          <section className="flex flex-col gap-5">
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
            <p className="text-sm leading-6 text-ink/70">
              {mode === "DAILY"
                ? flow.dailyHint
                : mode === "WEEKLY"
                  ? flow.weeklyHint
                  : flow.datesHint}
            </p>
            {mode === "WEEKLY" ? (
              <fieldset>
                <legend className="sr-only">{copy.weekly}</legend>
                <div className="grid grid-cols-4 gap-1 min-[375px]:grid-cols-7">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <label
                      className="flex min-h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl bg-fog px-1 text-sm font-semibold text-ink/75 has-[:checked]:bg-forest has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest"
                      key={day}
                    >
                      <input
                        className="sr-only"
                        checked={weekdays.includes(day)}
                        onChange={(event) =>
                          setWeekdays(
                            event.target.checked
                              ? [...weekdays, day].sort()
                              : weekdays.filter((value) => value !== day),
                          )
                        }
                        name="weekdays"
                        type="checkbox"
                        value={day}
                      />
                      {copy.weekdays[day]}
                    </label>
                  ))}
                </div>
                {showErrors && missingWeekdays ? (
                  <p
                    className="mt-3 text-sm font-semibold text-danger"
                    role="alert"
                  >
                    {copy.weekdayRequired}
                  </p>
                ) : null}
              </fieldset>
            ) : null}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="grid content-start gap-2">
                <label
                  className="text-sm font-semibold"
                  htmlFor="booking-start"
                >
                  {copy.startDate}
                </label>
                <input
                  className={`${inputClass} min-w-0 px-3`}
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
                  <span className="font-normal text-ink/65">
                    · {copy.optional}
                  </span>
                </label>
                <input
                  className={`${inputClass} min-w-0 px-3`}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  id="booking-end"
                  lang={locale}
                  min={startDate}
                  name="endDate"
                  type="date"
                />
              </div>
              <p className="col-span-2 text-xs leading-5 text-ink/70">
                {flow.noEnd}
              </p>
            </div>
            {mode === "DATES" ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">{copy.pickDates}</p>
                <DateCollection
                  dates={specificDates}
                  onDatesChange={setSpecificDates}
                  locale={locale}
                  min={startDate}
                  max={endDate}
                  name="specificDates"
                />
                {showErrors && missingDates ? (
                  <p className="text-sm font-semibold text-danger" role="alert">
                    {copy.datesRequired}
                  </p>
                ) : null}
              </div>
            ) : null}
            <details
              className="group pt-1"
              open={invalidClosedDates || undefined}
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-forest [&::-webkit-details-marker]:hidden focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-forest">
                <span>
                  {flow.exceptions}
                  {closedDates.length ? ` · ${closedDates.length}` : ""}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="space-y-3 pt-2">
                <p className="text-sm leading-6 text-ink/70">
                  {copy.exceptionsHint}
                </p>
                <DateCollection
                  dates={closedDates}
                  onDatesChange={setClosedDates}
                  locale={locale}
                  min={startDate}
                  max={endDate}
                  name="closedDates"
                />
              </div>
            </details>
          </section>
          {settings ? (
            <label className="flex min-h-16 cursor-pointer items-start gap-3">
              <input
                className="mt-1 h-5 w-5 accent-forest"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
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
        </>
      )}
      <div className="flex flex-col gap-4 pt-2">
        {state.error ? (
          <p className="text-sm font-semibold text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        {step === 1 &&
        state.success &&
        !pending &&
        submittedValues === values ? (
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
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step === 1 ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-ink/70 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50"
              type="button"
              disabled={pending || uploading}
              onClick={() => changeStep(0)}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {flow.previous}
            </button>
          ) : (
            <span />
          )}
          {step === 0 ? (
            <button
              key="next-step"
              className={`${primaryClass} w-full sm:w-auto`}
              disabled={uploading}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                changeStep(1);
              }}
            >
              {flow.next}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <button
              key="save-settings"
              className={`${primaryClass} w-full sm:w-auto`}
              disabled={pending || uploading}
              type="submit"
            >
              {pending ? copy.saving : settings ? copy.save : copy.create}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
