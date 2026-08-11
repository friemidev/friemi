"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  confirmSelectedActivityCheckInsAction,
  type ReviewActivityCheckInState,
} from "../actions/reviewActivityCheckIn";
import type { ActivityCheckInParticipantViewModel } from "../queries/getActivityCheckInRoster";

type ActivityCheckInReviewPanelProps = {
  activityId: string;
  locale: string;
  participants: ActivityCheckInParticipantViewModel[];
};

const initialState: ReviewActivityCheckInState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Fermer",
      confirm: "Confirmer les pointages",
      confirmed: "Confirme",
      empty: "Aucun participant a pointer.",
      needsReview: "A confirmer",
      open: "Pointages",
      pending: "Confirmation...",
      pendingRequests: "A confirmer",
      remove: "Marquer absent",
      selected: "Present",
      title: "Pointages",
      unselected: "Absent",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Close",
      confirm: "Confirm check-ins",
      confirmed: "Confirmed",
      empty: "No participants need check-in.",
      needsReview: "Waiting",
      open: "Check-ins",
      pending: "Confirming...",
      pendingRequests: "Waiting",
      remove: "Mark absent",
      selected: "Present",
      title: "Check-ins",
      unselected: "Absent",
    };
  }

  return {
    cancel: "关闭",
    confirm: "签到确认",
    confirmed: "已确认",
    empty: "暂无需要签到的参与者。",
    needsReview: "待确认",
    open: "签到管理",
    pending: "确认中...",
    pendingRequests: "待确认",
    remove: "取消签到",
    selected: "已到场",
    title: "签到管理",
    unselected: "未到场",
  };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "N";
}

function ConfirmRosterButton({
  disabled,
  locale,
}: {
  disabled: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <Button
      className="min-h-9 rounded-full border border-[#8AB68E]/80 bg-white px-3 text-xs font-bold text-[#156240] shadow-none hover:bg-[#FEFFF9]"
      disabled={disabled || pending}
      type="submit"
      variant="secondary"
    >
      {pending ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      {pending ? copy.pending : copy.confirm}
    </Button>
  );
}

function ActivityCheckInRosterForm({
  activityId,
  className,
  locale,
  onConfirmed,
  participants,
  selectedIds,
}: {
  activityId: string;
  className?: string;
  locale: string;
  onConfirmed: (confirmedIds: string[]) => void;
  participants: ActivityCheckInParticipantViewModel[];
  selectedIds: string[];
}) {
  const [state, formAction] = useActionState(
    confirmSelectedActivityCheckInsAction,
    initialState,
  );
  const [, startTransition] = useTransition();
  const router = useRouter();
  const handledStateRef = useRef<ReviewActivityCheckInState | null>(null);

  useEffect(() => {
    if (!state.success || handledStateRef.current === state) {
      return;
    }

    handledStateRef.current = state;
    onConfirmed(selectedIds);
    startTransition(() => {
      router.refresh();
    });
  }, [onConfirmed, router, selectedIds, startTransition, state]);

  return (
    <form action={formAction} className={className ?? "grid gap-3"} noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      {selectedIds.map((id) => (
        <input key={id} name="selectedParticipationIds" type="hidden" value={id} />
      ))}
      <ConfirmRosterButton
        disabled={participants.length === 0}
        locale={locale}
      />
      {state.formError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityCheckInReviewPanel({
  activityId,
  locale,
  participants,
}: ActivityCheckInReviewPanelProps) {
  const copy = getCopy(locale);
  const [isOpen, setIsOpen] = useState(false);
  const initialSelectedIds = useMemo(
    () =>
      participants
        .filter(
          (participant) =>
            participant.checkedInAt || participant.checkInRequestedAt,
        )
        .map((participant) => participant.id),
    [participants],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [reviewedSelectedIds, setReviewedSelectedIds] = useState<
    string[] | null
  >(null);
  const [focusedParticipantId, setFocusedParticipantId] = useState<
    string | null
  >(null);
  const actionPopoverRef = useRef<HTMLDivElement>(null);
  const initialConfirmedIds = useMemo(
    () =>
      participants
        .filter((participant) => participant.checkedInAt)
        .map((participant) => participant.id),
    [participants],
  );
  const participantIds = useMemo(
    () => participants.map((participant) => participant.id),
    [participants],
  );
  const confirmedIdSet = useMemo(
    () => new Set(reviewedSelectedIds ?? initialConfirmedIds),
    [initialConfirmedIds, reviewedSelectedIds],
  );
  const pendingRequestIds = useMemo(() => {
    if (reviewedSelectedIds) {
      return [];
    }

    return participants
      .filter(
        (participant) =>
          participant.checkInRequestedAt && !confirmedIdSet.has(participant.id),
      )
      .map((participant) => participant.id);
  }, [confirmedIdSet, participants, reviewedSelectedIds]);
  const pendingRequestIdSet = useMemo(
    () => new Set(pendingRequestIds),
    [pendingRequestIds],
  );
  const confirmedCount = participants.filter((participant) =>
    confirmedIdSet.has(participant.id),
  ).length;
  const pendingRequestCount = pendingRequestIds.length;

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(initialSelectedIds);
      setReviewedSelectedIds(null);
      setFocusedParticipantId(null);
    }
  }, [initialSelectedIds, isOpen]);

  useEffect(() => {
    setReviewedSelectedIds((current) =>
      current
        ? current.filter((participantId) => participantIds.includes(participantId))
        : current,
    );
  }, [participantIds]);

  function toggleParticipant(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
    setFocusedParticipantId(null);
  }

  useEffect(() => {
    if (!focusedParticipantId) {
      return;
    }

    function dismissFloatingAction(event: PointerEvent) {
      const target = event.target as Element | null;

      if (
        actionPopoverRef.current?.contains(event.target as Node) ||
        target?.closest("[data-checkin-avatar]")
      ) {
        return;
      }

      setFocusedParticipantId(null);
    }

    document.addEventListener("pointerdown", dismissFloatingAction);

    return () => {
      document.removeEventListener("pointerdown", dismissFloatingAction);
    };
  }, [focusedParticipantId]);

  return (
    <>
      <Button
        className="relative min-h-11 rounded-full border border-[#8AB68E]/80 bg-[#FEFFF9] px-4 text-sm font-bold text-[#156240] shadow-none hover:bg-[#F1F2EC]"
        onClick={() => setIsOpen(true)}
        type="button"
        variant="secondary"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {copy.open}
        {pendingRequestCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {pendingRequestCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm md:place-items-center"
          role="presentation"
        >
          <div
            aria-modal="true"
            className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[1.4rem] border border-[#D6D5B2] bg-[#FEFFF9] p-4 shadow-[0_22px_70px_rgba(36,28,14,0.22)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#111210]">
                  {copy.title}
                </h2>
              </div>
              <button
                aria-label={copy.cancel}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#111210]/70 ring-1 ring-[#D6D5B2]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#D6D5B2] bg-white px-4 py-3">
              <span className="text-sm font-bold text-[#156240]">
                {copy.confirmed} {confirmedCount}/{participants.length} 人
              </span>
              {pendingRequestCount > 0 ? (
                <span className="rounded-full bg-[#FFF1EF] px-2.5 py-1 text-xs font-bold text-[#E7457A]">
                  {copy.pendingRequests} {pendingRequestCount}
                </span>
              ) : null}
              <ActivityCheckInRosterForm
                activityId={activityId}
                className="grid justify-items-end gap-1"
                locale={locale}
                onConfirmed={(confirmedIds) => {
                  setReviewedSelectedIds(confirmedIds);
                  setFocusedParticipantId(null);
                }}
                participants={participants}
                selectedIds={selectedIds}
              />
            </div>

            {participants.length === 0 ? (
              <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-4 text-center text-sm font-semibold text-zinc-500">
                {copy.empty}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-5 gap-2.5">
                {participants.map((participant) => {
                  const selected = selectedIds.includes(participant.id);
                  const focused = focusedParticipantId === participant.id;
                  const confirmed = confirmedIdSet.has(participant.id);
                  const needsReview = pendingRequestIdSet.has(participant.id);

                  return (
                    <div className="relative grid min-w-0 justify-items-center" key={participant.id}>
                      <button
                        aria-pressed={selected}
                        className="grid min-w-0 justify-items-center"
                        data-checkin-avatar
                        onClick={() =>
                          setFocusedParticipantId(selected ? participant.id : null)
                        }
                        type="button"
                      >
                        <span
                          className={
                            confirmed
                              ? focused
                                ? "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#156240] text-base font-bold text-white ring-4 ring-[#8AB68E]"
                                : "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#156240] text-base font-bold text-white ring-2 ring-[#8AB68E]"
                              : needsReview
                                ? focused
                                  ? "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white text-base font-bold text-[#111210] ring-4 ring-[#F2B1A7]"
                                  : "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white text-base font-bold text-[#111210] ring-2 ring-[#F2B1A7]"
                              : focused
                                ? "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-base font-bold text-zinc-500 opacity-70 grayscale ring-4 ring-[#D6D5B2]"
                                : "relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-base font-bold text-zinc-500 opacity-60 grayscale ring-1 ring-zinc-300"
                          }
                        >
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
                          {confirmed ? (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E]">
                              <CheckCircle2 className="h-3 w-3" />
                            </span>
                          ) : needsReview ? (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#E7457A] ring-2 ring-white" />
                          ) : null}
                        </span>
                        <span className="mt-1 max-w-full truncate text-[10px] font-bold leading-none text-[#111210]/70">
                          {participant.user.nickname}
                        </span>
                        {confirmed || needsReview ? (
                          <span
                            className={
                              confirmed
                                ? "mt-0.5 text-[9px] font-bold leading-none text-[#156240]"
                                : "mt-0.5 text-[9px] font-bold leading-none text-[#E7457A]"
                            }
                          >
                            {confirmed ? copy.confirmed : copy.needsReview}
                          </span>
                        ) : null}
                      </button>

                      {focused ? (
                        <div
                          className="absolute left-1/2 top-[calc(100%+0.35rem)] z-20 w-24 -translate-x-1/2 rounded-xl border border-[#D6D5B2] bg-white p-1.5 text-center shadow-[0_12px_26px_rgba(17,18,16,0.14)]"
                          ref={actionPopoverRef}
                        >
                          <button
                            className="inline-flex min-h-8 w-full items-center justify-center rounded-full border border-red-200 bg-white px-2 text-[11px] font-bold text-red-700"
                            onClick={() => toggleParticipant(participant.id)}
                            type="button"
                          >
                            {copy.remove}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      ) : null}
    </>
  );
}
