"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Badge, Button } from "@chill-club/ui";
import { formatActivityDate } from "@chill-club/shared";
import { getCopy } from "@/lib/copy";
import {
  reviewParticipationAction,
  type ReviewParticipationState,
} from "../actions/reviewParticipation";
import type { PendingParticipantViewModel } from "../queries/getPendingParticipants";

type ParticipationApprovalPanelProps = {
  activityId: string;
  locale: string;
  pendingParticipants: PendingParticipantViewModel[];
};

type ReviewParticipationFormProps = {
  activityId: string;
  decision: "approve" | "reject";
  locale: string;
  participationId: string;
};

const initialState: ReviewParticipationState = {};

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "N";
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

  return (
    <Button
      type="submit"
      variant={isApprove ? "primary" : "secondary"}
      className={
        isApprove
          ? "w-full sm:w-auto"
          : "w-full text-red-700 hover:bg-red-50 sm:w-auto"
      }
      disabled={pending}
    >
      {pending ? t.reviewing : isApprove ? t.approve : t.reject}
    </Button>
  );
}

function ReviewParticipationForm({
  activityId,
  decision,
  locale,
  participationId,
}: ReviewParticipationFormProps) {
  const [state, formAction] = useActionState(
    reviewParticipationAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="decision" type="hidden" value={decision} />
      <input name="locale" type="hidden" value={locale} />
      <input name="participationId" type="hidden" value={participationId} />

      {state.formError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <ReviewButton decision={decision} locale={locale} />
    </form>
  );
}

export function ParticipationApprovalPanel({
  activityId,
  locale,
  pendingParticipants,
}: ParticipationApprovalPanelProps) {
  const t = getCopy(locale).approval;

  return (
    <section
      id="participation-approval"
      className="scroll-mt-24 rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t.title}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            {t.description}
          </p>
        </div>
        <Badge>{t.pendingCount(pendingParticipants.length)}</Badge>
      </div>

      {pendingParticipants.length === 0 ? (
        <p className="mt-4 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
          {t.empty}
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {pendingParticipants.map((participant) => (
            <article
              key={participant.id}
              className="rounded-md border border-zinc-200 bg-white p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-ink">
                  {getInitial(participant.user.nickname)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-ink">
                      {participant.user.nickname}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatActivityDate(participant.joinedAt, locale)}
                    </p>
                  </div>
                  {participant.user.friendCode ? (
                    <p className="mt-1 truncate font-mono text-xs font-medium tracking-[0.12em] text-zinc-500">
                      {participant.user.friendCode}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {participant.message || t.emptyMessage}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:flex sm:justify-end">
                <ReviewParticipationForm
                  activityId={activityId}
                  decision="reject"
                  locale={locale}
                  participationId={participant.id}
                />
                <ReviewParticipationForm
                  activityId={activityId}
                  decision="approve"
                  locale={locale}
                  participationId={participant.id}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
