"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  submitActivityPollVoteAction,
  withdrawActivityPollVoteAction,
  type PollActionState,
} from "../actions/pollActions";
import { getPollCopy } from "../copy";
import type { ActivityPollViewData } from "../server/pollService";

const initialState: PollActionState = {};

export function PollVoteForm({
  locale,
  poll,
}: {
  locale: string;
  poll: ActivityPollViewData;
}) {
  const router = useRouter();
  const copy = getPollCopy(locale);
  const [selected, setSelected] = useState<string[]>(poll.viewerSelectionIds);
  const [guestNickname, setGuestNickname] = useState(
    poll.viewerGuestNickname ?? "",
  );
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [voteState, voteAction, votePending] = useActionState(
    submitActivityPollVoteAction,
    initialState,
  );
  const [withdrawState, withdrawAction, withdrawPending] = useActionState(
    withdrawActivityPollVoteAction,
    initialState,
  );
  const isGuest = Boolean(poll.shareToken && !poll.viewerIsAuthenticated);

  useEffect(() => {
    if (!voteState.ok) return;

    setShowSavedToast(true);
    const refreshTimer = window.setTimeout(() => router.refresh(), 1600);
    const hideTimer = window.setTimeout(() => setShowSavedToast(false), 1900);

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(hideTimer);
    };
  }, [router, voteState]);

  useEffect(() => {
    if (withdrawState.ok) router.refresh();
  }, [router, withdrawState]);

  function toggleOption(optionId: string) {
    setSelected((current) => {
      if (poll.kind === "SINGLE_CHOICE") return [optionId];
      if (current.includes(optionId)) {
        return current.filter((id) => id !== optionId);
      }
      if (current.length >= (poll.maxSelections ?? poll.options.length)) {
        return current;
      }
      return [...current, optionId];
    });
  }

  return (
    <div className="space-y-4">
      <div
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+1rem)] z-[110] flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(21,98,64,0.28)] transition-all duration-300 ease-out sm:top-20 ${
          showSavedToast
            ? "translate-y-0 opacity-100"
            : "-translate-y-3 opacity-0"
        }`}
        role="status"
      >
        {showSavedToast ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {copy.voteSuccess}
          </>
        ) : null}
      </div>
      <form action={voteAction} className="space-y-4">
        <input name="locale" type="hidden" value={locale} />
        <input name="pollId" type="hidden" value={poll.id} />
        {poll.shareToken ? (
          <input name="shareToken" type="hidden" value={poll.shareToken} />
        ) : null}

        <div className="overflow-hidden border-y border-[#E3DFD0] bg-white">
          {poll.options.map((option, optionIndex) => {
            const checked = selected.includes(option.id);
            return (
              <label
                className={`relative block cursor-pointer overflow-hidden px-1 transition ${
                  checked ? "bg-[#F2F8F3]" : "hover:bg-[#FAFBF7]"
                } ${optionIndex > 0 ? "border-t border-[#EEEBDD]" : ""}`}
                key={option.id}
              >
                {poll.resultVisible ? (
                  <span
                    className="absolute inset-y-0 left-0 bg-[#DCEEDF]/55 transition-[width]"
                    style={{ width: `${option.percentage}%` }}
                  />
                ) : null}
                {checked ? (
                  <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[#369758]" />
                ) : null}
                <span className="relative flex min-h-[58px] items-start gap-3 px-2 py-4">
                  <input
                    checked={checked}
                    className="sr-only"
                    name="optionId"
                    onChange={() => toggleOption(option.id)}
                    type={poll.kind === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                    value={option.id}
                  />
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                      poll.kind === "SINGLE_CHOICE" ? "rounded-full" : "rounded"
                    } ${checked ? "border-[#156240] bg-[#156240] text-white" : "border-[#AEB7AE] bg-white"}`}
                  >
                    {checked ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="break-words text-sm font-bold leading-5 text-[#1D1D1B]">
                        {option.label}
                      </span>
                      {poll.resultVisible ? (
                        <span className="shrink-0 text-xs font-black leading-5 text-[#156240]">
                          {option.count} · {option.percentage}%
                        </span>
                      ) : null}
                    </span>
                    {option.voters.length > 0 ? (
                      <span className="mt-1 block text-[11px] leading-5 text-[#6E756F]">
                        {option.voters
                          .map((voter) =>
                            voter === "ANONYMOUS_GUEST"
                              ? copy.anonymous
                              : voter,
                          )
                          .join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {isGuest ? (
          <div className="space-y-3 border-y border-[#E3DFD0] bg-[#F6F7F1] px-3 py-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold text-[#607268]">
                {copy.guestNickname}
              </span>
              <input
                className="min-h-11 w-full rounded-lg border border-[#D8D7C5] bg-white px-3 text-sm outline-none focus:border-[#369758]"
                maxLength={30}
                name="guestNickname"
                onChange={(event) => setGuestNickname(event.target.value)}
                placeholder={copy.guestNicknamePlaceholder}
                required
                value={guestNickname}
              />
            </label>
          </div>
        ) : null}

        {poll.canVote ? (
          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white disabled:opacity-60"
            disabled={votePending || selected.length === 0}
            type="submit"
          >
            {votePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {poll.viewerBallotId ? copy.update : copy.submit}
          </button>
        ) : (
          <p className="border-y border-[#E3DFD0] bg-[#F3F4EE] px-4 py-3 text-center text-sm font-semibold text-[#687069]">
            {poll.accessDeniedReason === "LOGIN_REQUIRED"
              ? copy.loginRequired
              : poll.accessDeniedReason === "MEMBER_REQUIRED"
                ? copy.memberRequired
                : poll.effectiveStatus === "CANCELLED"
                  ? copy.cancelled
                  : copy.closed}
          </p>
        )}
        {voteState.error ? (
          <p className="text-center text-sm font-semibold text-[#9D332B]">
            {voteState.error}
          </p>
        ) : null}
      </form>

      {poll.viewerBallotId && poll.canVote ? (
        <form action={withdrawAction}>
          <input name="locale" type="hidden" value={locale} />
          <input name="pollId" type="hidden" value={poll.id} />
          {poll.shareToken ? (
            <input name="shareToken" type="hidden" value={poll.shareToken} />
          ) : null}
          <button
            className="min-h-10 w-full rounded-full text-xs font-bold text-[#8E4C45] transition hover:bg-[#FFF0ED] disabled:opacity-60"
            disabled={withdrawPending}
            type="submit"
          >
            {copy.withdraw}
          </button>
          {withdrawState.error ? (
            <p className="mt-2 text-center text-xs font-semibold text-[#9D332B]">
              {withdrawState.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
