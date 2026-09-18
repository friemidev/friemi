"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  changeActivityPollStatusAction,
  finalizeActivityPollAction,
  type PollActionState,
} from "../actions/pollActions";
import { getPollCopy } from "../copy";
import type { ActivityPollViewData } from "../server/pollService";

const initialState: PollActionState = {};

export function PollManagerControls({
  locale,
  poll,
}: {
  locale: string;
  poll: ActivityPollViewData;
}) {
  const copy = getPollCopy(locale);
  const router = useRouter();
  const [statusState, statusAction, statusPending] = useActionState(
    changeActivityPollStatusAction,
    initialState,
  );
  const [finalState, finalAction, finalPending] = useActionState(
    finalizeActivityPollAction,
    initialState,
  );

  useEffect(() => {
    if (statusState.ok || finalState.ok) router.refresh();
  }, [finalState.ok, router, statusState.ok]);

  return (
    <section className="space-y-3 rounded-lg border border-[#E3DFD0] bg-white p-4">
      <h2 className="text-sm font-black text-[#1D1D1B]">{copy.manage}</h2>
      <form action={statusAction} className="grid grid-cols-2 gap-2">
        <input name="locale" type="hidden" value={locale} />
        <input name="pollId" type="hidden" value={poll.id} />
        {poll.effectiveStatus === "OPEN" ? (
          <button
            className="min-h-10 rounded-full border border-[#D3BEB9] text-xs font-bold text-[#8E3F37] disabled:opacity-60"
            disabled={statusPending}
            name="intent"
            type="submit"
            value="close"
          >
            {copy.close}
          </button>
        ) : poll.status !== "CANCELLED" ? (
          <button
            className="min-h-10 rounded-full border border-[#B8CDBB] text-xs font-bold text-[#156240] disabled:opacity-60"
            disabled={statusPending}
            name="intent"
            type="submit"
            value="reopen"
          >
            {copy.reopen}
          </button>
        ) : null}
        {poll.status !== "CANCELLED" ? (
          <button
            className="min-h-10 rounded-full border border-[#E3DFD0] text-xs font-bold text-[#6D625D] disabled:opacity-60"
            disabled={statusPending}
            name="intent"
            type="submit"
            value="cancel"
          >
            {copy.cancelled}
          </button>
        ) : null}
      </form>
      {statusState.error ? (
        <p className="text-xs font-semibold text-[#9D332B]">
          {statusState.error}
        </p>
      ) : null}

      <form
        action={finalAction}
        className="space-y-2 border-t border-[#EEEBDD] pt-3"
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="pollId" type="hidden" value={poll.id} />
        <label className="block text-xs font-bold text-[#607268]">
          {copy.finalDecision}
          <select
            className="mt-2 min-h-10 w-full rounded-lg border border-[#D8D7C5] bg-white px-3 text-sm text-[#1D1D1B]"
            defaultValue={poll.finalOptionId ?? ""}
            name="optionId"
            required
          >
            <option disabled value="">
              {copy.option}
            </option>
            {poll.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="min-h-10 w-full rounded-full bg-[#F1F2E3] text-xs font-black text-[#1D1D1B] disabled:opacity-60"
          disabled={finalPending}
          type="submit"
        >
          {copy.finalDecision}
        </button>
        {finalState.error ? (
          <p className="text-xs font-semibold text-[#9D332B]">
            {finalState.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
