"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  cancelResidencyRequestAction,
  publishResidencyActivityAction,
  submitResidencyRequestAction,
} from "@/features/merchants/residency/actions";
import { getResidencyOwnerCopy } from "@/features/merchants/residency/ownerCopy";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";

const initialState: {
  success?: boolean;
  error?: string;
  slotId?: string;
  activityId?: string;
} = {};
const inputClass =
  "min-h-12 w-full rounded-xl bg-fog px-4 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-forest";
const primaryClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-forest px-6 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

export function ResidencyRequestForm({
  locale,
  initialDate = "",
}: {
  locale: string;
  initialDate?: string;
}) {
  const copy = getResidencyOwnerCopy(locale);
  const [state, action, pending] = useActionState(
    submitResidencyRequestAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-6 pt-7">
      <input name="locale" type="hidden" value={locale} />
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="residency-date">
          {copy.date}
        </label>
        <input
          className={inputClass}
          defaultValue={initialDate}
          id="residency-date"
          lang={locale}
          min={new Date().toISOString().slice(0, 10)}
          name="date"
          required
          type="date"
        />
        <p className="text-sm leading-6 text-ink/65">{copy.dateHint}</p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="residency-title">
          {copy.eventTitle}
        </label>
        <input
          className={inputClass}
          id="residency-title"
          maxLength={100}
          name="title"
          required
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="residency-description">
          {copy.eventDescription}
        </label>
        <textarea
          className={`${inputClass} min-h-36 py-3`}
          id="residency-description"
          maxLength={2000}
          name="description"
          required
        />
      </div>
      {state.error ? (
        <p className="text-sm font-semibold text-danger" role="alert">
          {state.error || copy.saveError}
        </p>
      ) : null}
      {state.success ? (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold text-forest">{copy.submitted}</p>
          {state.slotId ? (
            <Link
              className="text-sm font-bold text-forest underline underline-offset-4"
              href={withLocale(
                locale,
                `/profile/store/bookings/${state.slotId}`,
              )}
            >
              {copy.viewRequest}
            </Link>
          ) : null}
        </div>
      ) : null}
      <button
        className={primaryClass}
        disabled={pending || Boolean(state.success)}
        type="submit"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}

export function ResidencyPublishForm({
  locale,
  slotId,
  initialAddress,
}: {
  locale: string;
  slotId: string;
  initialAddress: string;
}) {
  const copy = getResidencyOwnerCopy(locale);
  const [state, action, pending] = useActionState(
    publishResidencyActivityAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-6 pt-7">
      <input name="locale" type="hidden" value={locale} />
      <input name="slotId" type="hidden" value={slotId} />
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="residency-time">
          {copy.startTime}
        </label>
        <input
          className={inputClass}
          id="residency-time"
          lang={locale}
          name="startTime"
          required
          type="time"
        />
        <p className="text-sm leading-6 text-ink/65">{copy.startTimeHint}</p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="residency-address">
          {copy.address}
        </label>
        <input
          className={inputClass}
          defaultValue={initialAddress}
          id="residency-address"
          maxLength={300}
          name="address"
          required
        />
        <p className="text-sm leading-6 text-ink/65">{copy.addressHint}</p>
      </div>
      {state.error ? (
        <p className="text-sm font-semibold text-danger" role="alert">
          {state.error || copy.publishError}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm font-semibold text-forest" role="status">
          {copy.publishSuccess}
        </p>
      ) : null}
      <button
        className={primaryClass}
        disabled={pending || Boolean(state.success)}
        type="submit"
      >
        {pending ? copy.publishing : copy.publish}
      </button>
      {state.activityId ? (
        <Link
          className="text-center text-sm font-bold text-forest underline underline-offset-4"
          href={getLocalizedActivityDetailPath(locale, state.activityId)}
        >
          {copy.viewActivity}
        </Link>
      ) : null}
    </form>
  );
}

export function ResidencyCancelForm({
  locale,
  slotId,
}: {
  locale: string;
  slotId: string;
}) {
  const copy = getResidencyOwnerCopy(locale);
  const [state, action, pending] = useActionState(
    cancelResidencyRequestAction,
    initialState,
  );

  return (
    <details className="group mt-12 rounded-2xl bg-fog/70 px-5 py-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink/70">
        {copy.cancel}
      </summary>
      <form action={action} className="grid gap-4 pb-2 pt-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="slotId" type="hidden" value={slotId} />
        <p className="text-sm leading-6 text-ink/65">{copy.cancelConfirm}</p>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {state.error || copy.cancelError}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm font-semibold text-forest" role="status">
            {copy.cancelSuccess}
          </p>
        ) : null}
        <button
          className="min-h-11 justify-self-start rounded-xl bg-ink px-5 text-sm font-bold text-white disabled:opacity-60"
          disabled={pending || Boolean(state.success)}
          type="submit"
        >
          {pending ? copy.cancelling : copy.cancelSubmit}
        </button>
      </form>
    </details>
  );
}
