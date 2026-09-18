import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  UsersRound,
  Vote,
} from "lucide-react";
import { getPollCopy } from "../copy";
import type { ActivityPollViewData } from "../server/pollService";
import { PollManagerControls } from "./PollManagerControls";
import { PollSharePanel } from "./PollSharePanel";
import { PollVoteForm } from "./PollVoteForm";

function formatDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PollDetailView({
  locale,
  poll,
  returnHref,
}: {
  locale: string;
  poll: ActivityPollViewData;
  returnHref: string;
}) {
  const copy = getPollCopy(locale);
  const finalOption = poll.options.find(
    (option) => option.id === poll.finalOptionId,
  );
  const statusLabel =
    poll.effectiveStatus === "OPEN"
      ? copy.open
      : poll.effectiveStatus === "CANCELLED"
        ? copy.cancelled
        : copy.closed;

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center">
        <Link
          aria-label={copy.back}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E3DFD0] bg-white text-[#156240]"
          href={returnHref}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-[17px] font-black text-[#1D1D1B]">
            {copy.poll}
          </h1>
          <p className="truncate text-xs font-semibold text-[#7C827A]">
            {poll.activity.title}
          </p>
        </div>
        <span />
      </header>

      <section className="rounded-lg border border-[#E3DFD0] bg-white p-5 shadow-[0_10px_30px_rgba(21,98,64,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              poll.effectiveStatus === "OPEN"
                ? "bg-[#E4F4E7] text-[#156240]"
                : "bg-[#F1F1ED] text-[#6E756F]"
            }`}
          >
            {statusLabel}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-[#707770]">
            <UsersRound className="h-3.5 w-3.5" />
            {poll.participantCount} {copy.people}
          </span>
        </div>
        <div className="mt-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECF5EF] text-[#156240]">
            <Vote className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-black leading-7 text-[#1D1D1B]">
              {poll.question}
            </h2>
            {poll.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#616961]">
                {poll.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#EEEBDD] pt-3 text-[11px] font-semibold text-[#777E77]">
          <span>
            {poll.kind === "SINGLE_CHOICE" ? copy.single : copy.multiple}
          </span>
          {poll.closesAt ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {copy.closesAt} {formatDate(locale, poll.closesAt)}
            </span>
          ) : null}
        </div>
      </section>

      {finalOption ? (
        <section className="flex items-start gap-3 rounded-lg border border-[#AFC9B4] bg-[#F2F8F3] p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#156240]" />
          <div>
            <p className="text-xs font-bold text-[#607268]">
              {copy.finalDecision}
            </p>
            <p className="mt-1 text-sm font-black text-[#1D1D1B]">
              {finalOption.label}
            </p>
          </div>
        </section>
      ) : null}

      <PollVoteForm locale={locale} poll={poll} />

      {!poll.resultVisible ? (
        <p className="rounded-lg bg-[#F4F5EF] px-4 py-3 text-center text-xs font-semibold text-[#697069]">
          {copy.noResults}
        </p>
      ) : null}

      {poll.canManage ? (
        <>
          <PollSharePanel
            initialAudience={poll.share?.audience ?? "MEMBERS_ONLY"}
            initialGuestIdentityMode={poll.share?.guestIdentityMode ?? null}
            locale={locale}
            pollId={poll.id}
            shareActive={poll.share?.active ?? false}
          />
          <PollManagerControls locale={locale} poll={poll} />
        </>
      ) : null}
    </div>
  );
}
