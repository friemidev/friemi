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
import {
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Save,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  saveActivityAttendanceAction,
  type SaveActivityAttendanceState,
} from "../actions/reviewActivityCheckIn";
import type { ActivityCheckInParticipantViewModel } from "../queries/getActivityCheckInRoster";
import type { PendingParticipantViewModel } from "../queries/getPendingParticipants";
import { ParticipationApprovalList } from "./ParticipationApprovalPanel";

type ActivityCheckInReviewPanelProps = {
  activityId: string;
  locale: string;
  pendingParticipants?: PendingParticipantViewModel[];
  participants: ActivityCheckInParticipantViewModel[];
  showParticipationApproval?: boolean;
  triggerLabel?: string;
  triggerVariant?: "button" | "icon" | "tool";
};

const initialState: SaveActivityAttendanceState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      absent: "Absent",
      absentCount: "Absents",
      approvalTab: "Inscriptions",
      attendanceTab: "Presences",
      cancel: "Fermer",
      defaultPresent:
        "Tout le monde est present par defaut. Selectionnez uniquement les absents.",
      empty: "Aucun participant a enregistrer.",
      open: "Presences",
      present: "Present",
      save: "Enregistrer",
      saved: (present: number, absent: number) =>
        `${present} presents, ${absent} absents enregistres.`,
      saving: "Enregistrement...",
      title: "Gestion des participants",
    };
  }

  if (locale === "en") {
    return {
      absent: "Absent",
      absentCount: "Absent",
      approvalTab: "Requests",
      attendanceTab: "Attendance",
      cancel: "Close",
      defaultPresent:
        "Everyone is present by default. Select only the people who did not attend.",
      empty: "No participants to record.",
      open: "Attendance",
      present: "Present",
      save: "Save attendance",
      saved: (present: number, absent: number) =>
        `Saved ${present} present and ${absent} absent.`,
      saving: "Saving...",
      title: "Participant management",
    };
  }

  return {
    absent: "未到场",
    absentCount: "未到场",
    approvalTab: "报名审核",
    attendanceTab: "到场记录",
    cancel: "关闭",
    defaultPresent: "默认所有人已到场，只需选择实际未到场的人。",
    empty: "暂无需要记录的参与者。",
    open: "签到管理",
    present: "默认到场",
    save: "保存未到场名单",
    saved: (present: number, absent: number) =>
      `已保存：${present} 人到场，${absent} 人未到场。`,
    saving: "保存中...",
    title: "参与管理",
  };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1) || "N";
}

function AttendanceSaveButton({
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
      className="min-h-11 w-full rounded-full bg-[#156240] px-4 text-sm font-bold text-white shadow-none hover:bg-[#0F5135]"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      {pending ? copy.saving : copy.save}
    </Button>
  );
}

function ActivityAttendanceForm({
  absentIds,
  activityId,
  locale,
  onSaved,
  participantCount,
}: {
  absentIds: string[];
  activityId: string;
  locale: string;
  onSaved: (absentIds: string[]) => void;
  participantCount: number;
}) {
  const [state, formAction] = useActionState(
    saveActivityAttendanceAction,
    initialState,
  );
  const [, startTransition] = useTransition();
  const router = useRouter();
  const handledStateRef = useRef<SaveActivityAttendanceState | null>(null);

  useEffect(() => {
    if (!state.success || handledStateRef.current === state) {
      return;
    }

    handledStateRef.current = state;
    onSaved(absentIds);
    startTransition(() => {
      router.refresh();
    });
  }, [absentIds, onSaved, router, startTransition, state]);

  return (
    <form action={formAction} className="grid gap-2" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      {absentIds.map((id) => (
        <input
          key={id}
          name="absentParticipationIds"
          type="hidden"
          value={id}
        />
      ))}
      <AttendanceSaveButton
        disabled={participantCount === 0}
        locale={locale}
      />
      {state.success ? (
        <p className="text-center text-xs font-bold text-[#156240]">
          {getCopy(locale).saved(
            state.presentCount ?? participantCount - absentIds.length,
            state.absentCount ?? absentIds.length,
          )}
        </p>
      ) : null}
      {state.formError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold leading-5 text-red-700">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityCheckInReviewPanel({
  activityId,
  locale,
  pendingParticipants = [],
  participants,
  showParticipationApproval = false,
  triggerLabel,
  triggerVariant = "button",
}: ActivityCheckInReviewPanelProps) {
  const copy = getCopy(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"approval" | "attendance">(
    showParticipationApproval && pendingParticipants.length > 0
      ? "approval"
      : "attendance",
  );
  const [pendingApprovalCount, setPendingApprovalCount] = useState(
    pendingParticipants.length,
  );
  const initialAbsentIds = useMemo(
    () =>
      participants
        .filter((participant) => participant.checkInCancelledAt)
        .map((participant) => participant.id),
    [participants],
  );
  const [absentIds, setAbsentIds] = useState<string[]>(initialAbsentIds);
  const absentIdSet = useMemo(() => new Set(absentIds), [absentIds]);

  useEffect(() => {
    setPendingApprovalCount(pendingParticipants.length);
  }, [pendingParticipants.length]);

  useEffect(() => {
    const openFromHash = () => {
      if (
        showParticipationApproval &&
        window.location.hash === "#participation-approval"
      ) {
        setActiveTab("approval");
        setIsOpen(true);
      }
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);

    return () => window.removeEventListener("hashchange", openFromHash);
  }, [showParticipationApproval]);

  useEffect(() => {
    if (!isOpen) {
      setAbsentIds(initialAbsentIds);
    }
  }, [initialAbsentIds, isOpen]);

  function toggleAbsent(id: string) {
    setAbsentIds((current) =>
      current.includes(id)
        ? current.filter((participantId) => participantId !== id)
        : [...current, id],
    );
  }

  const trigger =
    triggerVariant === "tool" ? (
      <button
        aria-label={triggerLabel ?? copy.open}
        className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[#607268] transition hover:bg-[#F2F8F3] hover:text-[#156240] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758] active:scale-[0.97]"
        onClick={() => setIsOpen(true)}
        title={triggerLabel ?? copy.open}
        type="button"
      >
        <span className="relative flex h-6 w-6 items-center justify-center text-[#5C8A6C] transition group-hover:text-[#156240]">
          <UserRoundCheck className="h-[18px] w-[18px]" />
          {pendingApprovalCount > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
              {pendingApprovalCount > 9 ? "9+" : pendingApprovalCount}
            </span>
          ) : null}
        </span>
        <span className="max-w-full truncate">{triggerLabel ?? copy.open}</span>
      </button>
    ) : triggerVariant === "icon" ? (
      <button
        aria-label={triggerLabel ?? copy.open}
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] transition active:scale-[0.96]"
        onClick={() => setIsOpen(true)}
        title={triggerLabel ?? copy.open}
        type="button"
      >
        <UserRoundCheck className="h-4 w-4" />
        {pendingApprovalCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#E7457A] ring-2 ring-white"
          />
        ) : null}
      </button>
    ) : (
      <Button
        className="relative min-h-11 rounded-full border border-[#8AB68E]/80 bg-[#FEFFF9] px-4 text-sm font-bold text-[#156240] shadow-none hover:bg-[#F1F2EC]"
        onClick={() => setIsOpen(true)}
        type="button"
        variant="secondary"
      >
        <UserRoundCheck className="mr-2 h-4 w-4" />
        {triggerLabel ?? copy.open}
        {pendingApprovalCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {pendingApprovalCount > 99 ? "99+" : pendingApprovalCount}
          </span>
        ) : null}
      </Button>
    );

  return (
    <>
      {trigger}

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] md:place-items-center"
          role="presentation"
        >
          <div
            aria-modal="true"
            className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[1.4rem] border border-[#D6D5B2] bg-[#FEFFF9] p-4 shadow-[0_22px_70px_rgba(36,28,14,0.22)]"
            id="participation-approval"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-[#111210]">{copy.title}</h2>
              <button
                aria-label={copy.cancel}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#111210]/70 ring-1 ring-[#D6D5B2]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showParticipationApproval ? (
              <div className="mt-4 grid grid-cols-2 rounded-lg bg-[#F1F2EC] p-1">
                <button
                  className={
                    activeTab === "approval"
                      ? "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-[#156240] shadow-sm"
                      : "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-[#6C746A]"
                  }
                  onClick={() => setActiveTab("approval")}
                  type="button"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {copy.approvalTab}
                  {pendingApprovalCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E7457A] px-1 text-[10px] text-white">
                      {pendingApprovalCount > 99 ? "99+" : pendingApprovalCount}
                    </span>
                  ) : null}
                </button>
                <button
                  className={
                    activeTab === "attendance"
                      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-bold text-[#156240] shadow-sm"
                      : "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-[#6C746A]"
                  }
                  onClick={() => setActiveTab("attendance")}
                  type="button"
                >
                  <UserRoundCheck className="h-4 w-4" />
                  {copy.attendanceTab}
                </button>
              </div>
            ) : null}

            {showParticipationApproval && activeTab === "approval" ? (
              <div className="mt-4">
                <ParticipationApprovalList
                  activityId={activityId}
                  locale={locale}
                  onPendingCountChange={setPendingApprovalCount}
                  pendingParticipants={pendingParticipants}
                />
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-start gap-3 border-b border-[#E8E4D8] pb-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF7EA] text-[#156240]">
                    <UserRoundCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#111210]">
                        {copy.defaultPresent}
                      </p>
                      <span className="shrink-0 text-xs font-bold text-[#C43D3D]">
                        {copy.absentCount} {absentIds.length}
                      </span>
                    </div>
                  </div>
                </div>

                {participants.length === 0 ? (
                  <p className="py-8 text-center text-sm font-semibold text-zinc-500">
                    {copy.empty}
                  </p>
                ) : (
                  <div className="my-5 grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5">
                    {participants.map((participant) => {
                      const isAbsent = absentIdSet.has(participant.id);

                      return (
                        <button
                          aria-pressed={isAbsent}
                          className="group grid min-w-0 justify-items-center gap-1.5"
                          key={participant.id}
                          onClick={() => toggleAbsent(participant.id)}
                          type="button"
                        >
                          <span
                            className={
                              isAbsent
                                ? "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-base font-bold text-zinc-500 grayscale ring-2 ring-[#D75A52]"
                                : "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#EAF7EA] text-base font-bold text-[#156240] ring-1 ring-[#8AB68E] transition group-active:scale-95"
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
                            <span
                              className={
                                isAbsent
                                  ? "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#C43D3D] text-white ring-2 ring-white"
                                  : "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#156240] text-white ring-2 ring-white"
                              }
                            >
                              {isAbsent ? (
                                <UserRoundX className="h-3 w-3" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                            </span>
                          </span>
                          <span className="max-w-full truncate text-[11px] font-bold leading-4 text-[#111210]/75">
                            {participant.user.nickname}
                          </span>
                          <span
                            className={
                              isAbsent
                                ? "text-[10px] font-bold leading-none text-[#C43D3D]"
                                : "text-[10px] font-semibold leading-none text-[#6C746A]"
                            }
                          >
                            {isAbsent ? copy.absent : copy.present}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <ActivityAttendanceForm
                  absentIds={absentIds}
                  activityId={activityId}
                  locale={locale}
                  onSaved={setAbsentIds}
                  participantCount={participants.length}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
