"use client";

import { formatActivityDate } from "@chill-club/shared";
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  LoaderCircle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
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
  onReviewed: (participationId: string) => void;
  participationId: string;
};

const initialState: ReviewParticipationState = {};

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "N";
}

function getDialogCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      guest: "Invité",
      open: "Gérer les inscriptions",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      guest: "Guest",
      open: "Review requests",
    };
  }

  return {
    close: "关闭",
    guest: "游客",
    open: "审核报名",
  };
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
    if (state.reviewedParticipationId !== participationId) {
      return;
    }

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

export function ParticipationApprovalPanel({
  activityId,
  locale,
  pendingParticipants,
}: ParticipationApprovalPanelProps) {
  const t = getCopy(locale).approval;
  const dialogCopy = getDialogCopy(locale);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const reviewedIdSet = useMemo(() => new Set(reviewedIds), [reviewedIds]);
  const visibleParticipants = useMemo(
    () =>
      pendingParticipants.filter(
        (participant) => !reviewedIdSet.has(participant.id),
      ),
    [pendingParticipants, reviewedIdSet],
  );
  const pendingCount = visibleParticipants.length;
  const badgeText = pendingCount > 99 ? "99+" : String(pendingCount);
  const handleReviewed = useCallback((participationId: string) => {
    setReviewedIds((current) =>
      current.includes(participationId)
        ? current
        : [...current, participationId],
    );
  }, []);

  useEffect(() => {
    setMounted(true);

    const openFromHash = () => {
      if (window.location.hash === "#participation-approval") {
        setOpen(true);
      }
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    return () => {
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const dialog = open ? (
    <div
      aria-labelledby="participation-approval-title"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex min-h-0 flex-col bg-[#FEFFF9] text-[#111210]"
      role="dialog"
    >
      <header className="shrink-0 border-b border-[#E7E1CA] bg-[#FEFFF9]/96 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3">
          <button
            aria-label={dialogCopy.close}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] transition active:scale-95"
            onClick={() => setOpen(false)}
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2
              className="truncate text-lg font-bold leading-tight"
              id="participation-approval-title"
            >
              {t.title}
            </h2>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#6C746A]">
              {t.pendingCount(pendingCount)}
            </p>
          </div>
          <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#EAF5E8] px-3 text-xs font-bold text-[#156240]">
            {pendingCount}
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
        <div className="mx-auto w-full max-w-2xl">
          <p className="text-sm font-semibold leading-6 text-[#6C746A]">
            {t.description}
          </p>

          {visibleParticipants.length === 0 ? (
            <div className="grid min-h-[45svh] place-items-center text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EAF5E8] text-[#156240]">
                  <ClipboardCheck className="h-7 w-7" />
                </span>
                <p className="mt-4 text-sm font-bold text-[#52655E]">
                  {t.empty}
                </p>
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
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#EAF5E8] text-sm font-bold text-[#156240] ring-1 ring-[#BFD8B9]">
                      {getInitial(participant.user.nickname)}
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
      </main>
    </div>
  ) : null;

  return (
    <>
      <section
        className="flex w-full px-1 sm:px-0 md:justify-end"
        id="participation-approval"
      >
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={dialogCopy.open}
          className="relative inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#8AB68E] bg-white px-4 py-2 text-[#156240] transition hover:bg-[#F4F8F1] active:scale-[0.98] md:w-auto md:min-w-52"
          onClick={() => setOpen(true)}
          type="button"
        >
          <ClipboardCheck className="h-5 w-5 shrink-0" />
          <span className="truncate text-sm font-bold leading-tight">
            {t.title}
          </span>
          <span className="text-xs font-semibold text-[#6C746A]">
            {t.pendingCount(pendingCount)}
          </span>
          {pendingCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#E7455F] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {badgeText}
            </span>
          ) : null}
        </button>
      </section>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
