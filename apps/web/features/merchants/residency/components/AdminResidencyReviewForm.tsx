"use client";

import { useActionState } from "react";
import {
  cancelResidencyRequestAdminAction,
  reviewResidencyRequestAction,
} from "@/features/merchants/residency/actions";
import { getAdminResidencyCopy } from "@/features/merchants/residency/adminCopy";

const initialState: { success?: boolean; error?: string; slotId?: string } = {};

export function AdminResidencyReviewForm({
  locale,
  slotId,
}: {
  locale: string;
  slotId: string;
}) {
  const copy = getAdminResidencyCopy(locale);
  const [approveState, approveAction, approving] = useActionState(
    reviewResidencyRequestAction,
    initialState,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    reviewResidencyRequestAction,
    initialState,
  );

  return (
    <section className="mt-9 space-y-7" aria-label={copy.pending}>
      <form action={approveAction}>
        <input name="locale" type="hidden" value={locale} />
        <input name="slotId" type="hidden" value={slotId} />
        <input name="decision" type="hidden" value="approve" />
        <button
          className="min-h-12 w-full rounded-xl bg-forest px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          disabled={approving || approveState.success || rejectState.success}
          type="submit"
        >
          {approving ? copy.approving : copy.approve}
        </button>
        {approveState.error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {approveState.error || copy.failed}
          </p>
        ) : null}
        {approveState.success ? (
          <p className="mt-2 text-sm font-semibold text-forest" role="status">
            {copy.reviewed}
          </p>
        ) : null}
      </form>
      <form action={rejectAction} className="rounded-2xl bg-fog/70 px-5 py-5">
        <input name="locale" type="hidden" value={locale} />
        <input name="slotId" type="hidden" value={slotId} />
        <input name="decision" type="hidden" value="reject" />
        <label
          className="block text-sm font-bold"
          htmlFor="residency-rejection-reason"
        >
          {copy.reason}
        </label>
        <p className="mt-1 text-sm leading-6 text-ink/65">{copy.reasonHint}</p>
        <textarea
          className="mt-4 min-h-28 w-full rounded-xl bg-white px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-forest"
          id="residency-rejection-reason"
          maxLength={500}
          name="reason"
          required
        />
        <button
          className="mt-4 min-h-11 rounded-xl bg-ink px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          disabled={rejecting || approveState.success || rejectState.success}
          type="submit"
        >
          {rejecting ? copy.rejecting : copy.reject}
        </button>
        {rejectState.error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {rejectState.error || copy.failed}
          </p>
        ) : null}
        {rejectState.success ? (
          <p className="mt-2 text-sm font-semibold text-forest" role="status">
            {copy.reviewed}
          </p>
        ) : null}
      </form>
    </section>
  );
}

export function AdminResidencyCancelForm({
  locale,
  slotId,
  pendingRequest = false,
}: {
  locale: string;
  slotId: string;
  pendingRequest?: boolean;
}) {
  const copy = getAdminResidencyCopy(locale);
  const [state, action, pending] = useActionState(
    cancelResidencyRequestAdminAction,
    initialState,
  );

  return (
    <details className="mt-12 rounded-2xl bg-fog/70 px-5 py-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink/70">
        {pendingRequest ? copy.cancelPending : copy.cancel}
      </summary>
      <form action={action} className="grid gap-4 pb-2 pt-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="slotId" type="hidden" value={slotId} />
        <p className="text-sm leading-6 text-ink/65">
          {pendingRequest ? copy.cancelPendingHint : copy.cancelHint}
        </p>
        {state.error ? (
          <p className="text-sm text-danger" role="alert">
            {state.error || copy.failed}
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
          {copy.cancelConfirm}
        </button>
      </form>
    </details>
  );
}
