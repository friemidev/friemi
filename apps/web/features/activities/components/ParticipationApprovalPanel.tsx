"use client";

import { formatActivityDate } from "@chill-club/shared";
import { Check, ClipboardCheck, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { getCopy } from "@/lib/copy";
import {
  reviewParticipationAction,
  type ReviewParticipationState,
} from "../actions/reviewParticipation";
import type { PendingParticipantViewModel } from "../queries/getPendingParticipants";

type ParticipationApprovalListProps = {
  activityId: string;
  locale: string;
  onPendingCountChange?: (count: number) => void;
  pendingParticipants: PendingParticipantViewModel[];
};

type ReviewParticipationFormProps = {
  activityId: string;
  decision: "approve" | "reject";
  locale: string;
  onReviewed: (participationId: string) => void;
  participationId: string;
};

const initialState: ReviewParticipationState = {};

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "N";
}

function getDialogCopy(locale: string) {
  if (locale === "fr") {
    return { guest: "Invite" };
  }

  if (locale === "en") {
    return { guest: "Guest" };
  }

  return { guest: "游客" };
}

function ReviewButton({
  decision,
  locale,
}: {
  decision: "approve" | "reject";
  locale: string;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).approval;
  const isApprove = decision === "approve";
  const Icon = isApprove ? Check : X;

  return (
    <button
      aria-label={isApprove ? t.approve : t.reject}
      className={
        isApprove
          ? "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#156240] px-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          : "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#E5B8BF] bg-white px-3 text-sm font-bold text-[#9A2135] transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      }
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{pending ? t.reviewing : isApprove ? t.approve : t.reject}</span>
    </button>
  );
}

function ReviewParticipationForm({
  activityId,
  decision,
  locale,
  onReviewed,
  participationId,
}: ReviewParticipationFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    reviewParticipationAction,
    initialState,
  );

  useEffect(() => {
    if (state.reviewedParticipationId !== participationId) return;

    onReviewed(participationId);
    router.refresh();
  }, [onReviewed, participationId, router, state.reviewedParticipationId]);

  return (
    <form action={formAction} className="grid gap-1.5" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="decision" type="hidden" value={decision} />
      <input name="locale" type="hidden" value={locale} />
      <input name="participationId" type="hidden" value={participationId} />
      <input name="responseMode" type="hidden" value="inline" />
      <ReviewButton decision={decision} locale={locale} />
      {state.formError ? (
        <p
          className="text-xs font-semibold leading-5 text-[#9A2135]"
          role="alert"
        >
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

export function ParticipationApprovalList({
  activityId,
  locale,
  onPendingCountChange,
  pendingParticipants,
}: ParticipationApprovalListProps) {
  const t = getCopy(locale).approval;
  const dialogCopy = getDialogCopy(locale);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const reviewedIdSet = useMemo(() => new Set(reviewedIds), [reviewedIds]);
  const visibleParticipants = useMemo(
    () =>
      pendingParticipants.filter(
        (participant) => !reviewedIdSet.has(participant.id),
      ),
    [pendingParticipants, reviewedIdSet],
  );
  const handleReviewed = useCallback((participationId: string) => {
    setReviewedIds((current) =>
      current.includes(participationId)
        ? current
        : [...current, participationId],
    );
  }, []);

  useEffect(() => {
    onPendingCountChange?.(visibleParticipants.length);
  }, [onPendingCountChange, visibleParticipants.length]);

  return (
    <div>
      <p className="text-sm font-semibold leading-6 text-[#6C746A]">
        {t.description}
      </p>
      {visibleParticipants.length === 0 ? (
        <div className="grid min-h-64 place-items-center text-center">
          <div>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
              <ClipboardCheck className="h-7 w-7" />
            </span>
            <p className="mt-4 text-sm font-bold text-[#52655E]">{t.empty}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {visibleParticipants.map((participant) => (
            <article
              className="rounded-lg bg-white p-4 shadow-[0_10px_28px_rgba(17,18,16,0.06)] ring-1 ring-[#DCE3DC]"
              key={participant.id}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EAF5E8] text-sm font-bold text-[#156240] ring-1 ring-[#BFD8B9]">
                  {participant.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={participant.user.avatarUrl}
                    />
                  ) : (
                    getInitial(participant.user.nickname)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {participant.user.nickname}
                      </p>
                      {participant.isGuest ? (
                        <p className="mt-1 text-[11px] font-semibold text-[#8A9188]">
                          {dialogCopy.guest}
                        </p>
                      ) : participant.user.friendCode ? (
                        <p className="mt-1 truncate text-[11px] font-semibold text-[#8A9188] friemi-tabular">
                          {participant.user.friendCode}
                        </p>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-[11px] font-semibold text-[#8A9188]">
                      {formatActivityDate(participant.joinedAt, locale)}
                    </time>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#52655E]">
                    {participant.message || t.emptyMessage}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ReviewParticipationForm
                  activityId={activityId}
                  decision="reject"
                  locale={locale}
                  onReviewed={handleReviewed}
                  participationId={participant.id}
                />
                <ReviewParticipationForm
                  activityId={activityId}
                  decision="approve"
                  locale={locale}
                  onReviewed={handleReviewed}
                  participationId={participant.id}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
