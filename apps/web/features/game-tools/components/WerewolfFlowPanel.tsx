"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Crown,
  Moon,
  ShieldAlert,
  Sunrise,
  Vote,
  X,
} from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitWerewolfNightActionAction,
  submitWerewolfVoteAction,
  updateWerewolfCandidacyAction,
  updateWerewolfFlowAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import {
  canUseWerewolfAntidote,
  formatWerewolfSeatLabel,
  getWerewolfFlowRecordLabel,
  getWerewolfNightCues,
  getWerewolfNightActionLabel,
  localizeWerewolfFlowText,
  shouldShowWerewolfSuggestedSeat,
  type WerewolfFlowState,
} from "@/features/game-tools/werewolfFlow";
import type { WerewolfRoleKey } from "@/features/game-tools/werewolfConfig";

type FlowSubmission = {
  actionKind: string | null;
  id: string;
  kind: string;
  roundIndex: number;
  seerResult: string | null;
  secondaryTargetSeatNumber: number | null;
  submittedAt: string;
  targetSeatNumber: number | null;
  voterSeatNumber: number | null;
};

function getSeerResultNotice({
  locale,
  result,
  targetSeatNumber,
  thirdPartyLabel,
}: {
  locale: string;
  result: string;
  targetSeatNumber: number;
  thirdPartyLabel: string;
}) {
  const resultLabel =
    result === "WEREWOLF"
      ? localizeWerewolfFlowText(locale, {
          "zh-CN": "狼人阵营",
          en: "Werewolf faction",
          fr: "Camp des loups",
        })
      : result === "THIRD_PARTY"
        ? thirdPartyLabel
        : localizeWerewolfFlowText(locale, {
            "zh-CN": "好人阵营",
            en: "Good faction",
            fr: "Camp des villageois",
          });

  return `${formatWerewolfSeatLabel(targetSeatNumber, locale)}: ${resultLabel}`;
}

type FlowEvent = {
  createdAt: string;
  id: string;
  payload?: unknown;
  type: string;
};

type FlowSeat = {
  displayName: string;
  isActive: boolean;
  isDead: boolean;
  isPlayerSeat: boolean;
  roleAlignment?: string | null;
  roleKey?: string | null;
  seatNumber: number;
};

type WerewolfFlowPanelProps = {
  events: FlowEvent[];
  flow: WerewolfFlowState;
  isJudge: boolean;
  inlineTrigger?: boolean;
  locale: string;
  privateToken: string;
  roleDeck: Array<string | null>;
  roleKey: WerewolfRoleKey | null;
  roomStatus: string;
  seatNumber: number;
  seats: FlowSeat[];
  sheriffSeatNumber: number | null;
  submissions: FlowSubmission[];
};

const initialState: WerewolfRoomActionState = {};

function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? "..." : children}
    </button>
  );
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      abstain: "S'abstenir",
      actionSaved: "Action confirmée",
      antidote: "Utiliser l'antidote",
      candidate: "Se présenter",
      close: "Fermer",
      confirm: "Confirmer",
      currentFlow: "Étape actuelle",
      flow: "Déroulé du maître",
      factionAlerts: {
        GODS_ELIMINATED: "Tous les rôles spéciaux sont éliminés",
        THIRD_PARTY_WIN: "Seul le troisième camp reste en jeu",
        VILLAGERS_ELIMINATED: "Tous les villageois sont éliminés",
        WEREWOLVES_ELIMINATED: "Tous les loups sont éliminés",
      },
      next: "Étape suivante",
      noVote: "Aucun vote enregistré",
      pass: "Ne rien utiliser",
      poison: "Utiliser le poison",
      previous: "Retour",
      records: "Historique",
      playerRecords: "Historique des votes",
      resolveVote: "Clore et compter",
      selectTarget: "Choisir un joueur",
      stages: {
        DAY_ANNOUNCEMENT: "Annonce du matin",
        DAY_SPEECH: "Prises de parole",
        EXILE_RESULT: "Résultat de l'élimination",
        EXILE_RUNOFF_SPEECH: "Discours du second tour",
        EXILE_RUNOFF_VOTE: "Second vote d'élimination",
        EXILE_VOTE: "Vote d'élimination",
        FINISHED: "Partie terminée",
        NIGHT: "Nuit",
        SHERIFF_RESULT: "Résultat du capitaine",
        SHERIFF_RUNOFF_SPEECH: "Discours du second tour",
        SHERIFF_RUNOFF_VOTE: "Second vote du capitaine",
        SHERIFF_SIGNUP: "Candidatures au poste de capitaine",
        SHERIFF_SPEECH: "Discours des candidats",
        SHERIFF_VOTE: "Vote du capitaine",
        SHERIFF_WITHDRAW: "Retraits des candidats",
      },
      target: "Cible",
      thirdParty: "Troisième camp",
      vote: "Confirmer le vote",
      withdraw: "Se retirer",
    };
  }

  if (locale === "en") {
    return {
      abstain: "Abstain",
      actionSaved: "Action confirmed",
      antidote: "Use antidote",
      candidate: "Run for sheriff",
      close: "Close",
      confirm: "Confirm",
      currentFlow: "Current step",
      flow: "Judge flow",
      factionAlerts: {
        GODS_ELIMINATED: "All special good roles are eliminated",
        THIRD_PARTY_WIN: "Only the third party remains",
        VILLAGERS_ELIMINATED: "All villagers are eliminated",
        WEREWOLVES_ELIMINATED: "All werewolves are eliminated",
      },
      next: "Next step",
      noVote: "No votes yet",
      pass: "Use nothing",
      poison: "Use poison",
      previous: "Previous",
      records: "Records",
      playerRecords: "Vote records",
      resolveVote: "Close and tally",
      selectTarget: "Choose a player",
      stages: {
        DAY_ANNOUNCEMENT: "Morning announcement",
        DAY_SPEECH: "Day speeches",
        EXILE_RESULT: "Exile result",
        EXILE_RUNOFF_SPEECH: "Exile runoff speeches",
        EXILE_RUNOFF_VOTE: "Exile runoff vote",
        EXILE_VOTE: "Exile vote",
        FINISHED: "Game finished",
        NIGHT: "Night",
        SHERIFF_RESULT: "Sheriff result",
        SHERIFF_RUNOFF_SPEECH: "Sheriff runoff speeches",
        SHERIFF_RUNOFF_VOTE: "Sheriff runoff vote",
        SHERIFF_SIGNUP: "Sheriff signup",
        SHERIFF_SPEECH: "Candidate speeches",
        SHERIFF_VOTE: "Sheriff vote",
        SHERIFF_WITHDRAW: "Candidate withdrawal",
      },
      target: "Target",
      thirdParty: "Third party",
      vote: "Confirm vote",
      withdraw: "Withdraw",
    };
  }

  return {
    abstain: "弃票",
    actionSaved: "操作已确认",
    antidote: "使用解药",
    candidate: "上警竞选",
    close: "收起",
    confirm: "确认行动",
    currentFlow: "当前流程",
    flow: "法官流程",
    factionAlerts: {
      GODS_ELIMINATED: "神职阵营玩家已全部死亡",
      THIRD_PARTY_WIN: "场上仅剩第三方阵营",
      VILLAGERS_ELIMINATED: "平民阵营玩家已全部死亡",
      WEREWOLVES_ELIMINATED: "狼人阵营玩家已全部死亡",
    },
    next: "下一步",
    noVote: "暂时没有投票记录",
    pass: "本晚不用药",
    poison: "使用毒药",
    previous: "上一步",
    records: "本局记录",
    playerRecords: "投票记录",
    resolveVote: "结束投票并计票",
    selectTarget: "选择玩家",
    stages: {
      DAY_ANNOUNCEMENT: "白天宣布死讯",
      DAY_SPEECH: "本轮发言",
      EXILE_RESULT: "放逐投票结果",
      EXILE_RUNOFF_SPEECH: "放逐平票 PK 发言",
      EXILE_RUNOFF_VOTE: "放逐第二轮投票",
      EXILE_VOTE: "放逐投票",
      FINISHED: "本局结束",
      NIGHT: "夜间流程",
      SHERIFF_RESULT: "警长投票结果",
      SHERIFF_RUNOFF_SPEECH: "警长平票 PK 发言",
      SHERIFF_RUNOFF_VOTE: "警长第二轮投票",
      SHERIFF_SIGNUP: "上警竞选",
      SHERIFF_SPEECH: "上警竞选发言",
      SHERIFF_VOTE: "警长投票",
      SHERIFF_WITHDRAW: "退水确认",
    },
    target: "目标",
    thirdParty: "第三方阵营",
    vote: "确认投票",
    withdraw: "退水",
  };
}

export function WerewolfFlowPanel({
  events,
  flow,
  isJudge,
  inlineTrigger = false,
  locale,
  privateToken,
  roleDeck,
  roleKey,
  roomStatus,
  seatNumber,
  seats,
  sheriffSeatNumber,
  submissions,
}: WerewolfFlowPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"flow" | "records">("flow");
  const [flowState, flowAction] = useActionState(
    updateWerewolfFlowAction,
    initialState,
  );
  const [candidacyState, candidacyAction] = useActionState(
    updateWerewolfCandidacyAction,
    initialState,
  );
  const [voteState, voteAction] = useActionState(
    submitWerewolfVoteAction,
    initialState,
  );
  const [nightState, nightAction] = useActionState(
    submitWerewolfNightActionAction,
    initialState,
  );
  const [candidacyActionScope, setCandidacyActionScope] = useState<
    string | null
  >(null);
  const [voteActionScope, setVoteActionScope] = useState<string | null>(null);
  const [nightActionScope, setNightActionScope] = useState<string | null>(null);
  const [seerNotice, setSeerNotice] = useState<string | null>(null);
  const [dismissedFactionAlertId, setDismissedFactionAlertId] = useState<
    string | null
  >(null);
  const [factionAlertDragY, setFactionAlertDragY] = useState(0);
  const factionAlertDragStartYRef = useRef<number | null>(null);
  const factionAlertDragYRef = useRef(0);
  const factionAlertFormRef = useRef<HTMLFormElement>(null);
  const autoOpenedPlayerActionScopeRef = useRef<string | null>(null);
  const factionAlertDismissStateRef = useRef<WerewolfRoomActionState | null>(
    null,
  );
  const t = getCopy(locale);
  const currentActionScope = `${flow.sessionIndex}:${flow.stage}:${flow.cueIndex}`;
  const scopedCandidacyAction = (payload: FormData) => {
    setCandidacyActionScope(currentActionScope);
    candidacyAction(payload);
  };
  const scopedVoteAction = (payload: FormData) => {
    setVoteActionScope(currentActionScope);
    voteAction(payload);
  };
  const scopedNightAction = (payload: FormData) => {
    setNightActionScope(currentActionScope);
    nightAction(payload);
  };
  const playerSeats = useMemo(
    () => seats.filter((seat) => seat.isPlayerSeat),
    [seats],
  );
  const aliveSeats = playerSeats.filter(
    (seat) => seat.isActive && !seat.isDead,
  );
  const viewerSeat = seats.find((seat) => seat.seatNumber === seatNumber);
  const viewerCanAct = Boolean(
    !isJudge && viewerSeat?.isActive && !viewerSeat.isDead,
  );
  const currentCue =
    flow.stage === "NIGHT"
      ? (getWerewolfNightCues(roleDeck, flow.dayNumber, locale)[
          flow.cueIndex
        ] ?? null)
      : null;
  const activeSubmissions = submissions.filter(
    (submission) => submission.roundIndex === flow.sessionIndex,
  );
  const persistedSeerSubmission = activeSubmissions.find(
    (submission) =>
      submission.actionKind === "SEER" &&
      submission.voterSeatNumber === seatNumber &&
      submission.seerResult &&
      submission.targetSeatNumber,
  );
  const persistedSeerNotice =
    persistedSeerSubmission?.seerResult &&
    persistedSeerSubmission.targetSeatNumber
      ? getSeerResultNotice({
          locale,
          result: persistedSeerSubmission.seerResult,
          targetSeatNumber: persistedSeerSubmission.targetSeatNumber,
          thirdPartyLabel: t.thirdParty,
        })
      : null;
  const wolfAttackSeatNumber = activeSubmissions.find(
    (submission) => submission.actionKind === "WOLF_KILL",
  )?.targetSeatNumber;
  const guardTargetSeatNumber = activeSubmissions.find(
    (submission) => submission.actionKind === "GUARD",
  )?.targetSeatNumber;
  const witchUsedAntidote = activeSubmissions.some(
    (submission) => submission.actionKind === "WITCH_ANTIDOTE",
  );
  const witchPoisonTargetSeatNumber = activeSubmissions.find(
    (submission) => submission.actionKind === "WITCH_POISON",
  )?.targetSeatNumber;
  const nightResolution = wolfAttackSeatNumber
    ? guardTargetSeatNumber === wolfAttackSeatNumber && witchUsedAntidote
      ? localizeWerewolfFlowText(locale, {
          "zh-CN": `夜间建议：${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)}同守同救，仍然死亡。`,
          en: `Night result: ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} was both guarded and saved, so still dies.`,
          fr: `Résultat de la nuit : le ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} a été protégé et sauvé, il meurt donc quand même.`,
        })
      : guardTargetSeatNumber === wolfAttackSeatNumber || witchUsedAntidote
        ? localizeWerewolfFlowText(locale, {
            "zh-CN": `夜间建议：${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)}获救。`,
            en: `Night result: ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} survives.`,
            fr: `Résultat de la nuit : le ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} survit.`,
          })
        : localizeWerewolfFlowText(locale, {
            "zh-CN": `夜间建议：${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)}死亡。`,
            en: `Night result: ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} dies.`,
            fr: `Résultat de la nuit : le ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} meurt.`,
          })
    : null;
  const isWolfRole = ["werewolf", "wolf_king", "white_wolf_king"].includes(
    roleKey ?? "",
  );
  const ownSubmission =
    activeSubmissions.some(
      (submission) =>
        submission.voterSeatNumber === seatNumber &&
        (submission.kind !== "WEREWOLF_NIGHT_ACTION" ||
          !currentCue ||
          (currentCue.actionKind === "WITCH"
            ? submission.actionKind?.startsWith("WITCH_")
            : submission.actionKind === currentCue.actionKind)),
    ) ||
    Boolean(
      currentCue?.actionKind === "WOLF_KILL" &&
      isWolfRole &&
      activeSubmissions.some(
        (submission) => submission.actionKind === "WOLF_KILL",
      ),
    );
  const activePlayerSeatNumbers = new Set(
    aliveSeats.map((seat) => seat.seatNumber),
  );
  const activeCandidates = flow.candidateSeatNumbers.filter(
    (candidate) =>
      activePlayerSeatNumbers.has(candidate) &&
      !flow.withdrawnSeatNumbers.includes(candidate),
  );
  const isSheriffVote =
    flow.stage === "SHERIFF_VOTE" || flow.stage === "SHERIFF_RUNOFF_VOTE";
  const isExileVote =
    flow.stage === "EXILE_VOTE" || flow.stage === "EXILE_RUNOFF_VOTE";
  const isVoteStage = isSheriffVote || isExileVote;
  const voteTargets =
    flow.stage === "SHERIFF_RUNOFF_VOTE" || flow.stage === "EXILE_RUNOFF_VOTE"
      ? flow.runoffSeatNumbers.filter((seatNumber) =>
          activePlayerSeatNumbers.has(seatNumber),
        )
      : isSheriffVote
        ? activeCandidates
        : aliveSeats.map((seat) => seat.seatNumber);
  const canVote =
    viewerCanAct &&
    isVoteStage &&
    !ownSubmission &&
    (!isSheriffVote || !flow.candidateSeatNumbers.includes(seatNumber));
  const viewerIsCandidate = flow.candidateSeatNumbers.includes(seatNumber);
  const viewerIsWithdrawn = flow.withdrawnSeatNumbers.includes(seatNumber);
  const shouldAutoOpenPlayerAction =
    !isJudge &&
    viewerCanAct &&
    ((flow.stage === "SHERIFF_SIGNUP" && !viewerIsCandidate) ||
      (flow.stage === "SHERIFF_WITHDRAW" &&
        viewerIsCandidate &&
        !viewerIsWithdrawn) ||
      canVote);
  const records = events
    .map((event) => ({
      event,
      label: getWerewolfFlowRecordLabel(event, locale),
    }))
    .filter((entry): entry is { event: FlowEvent; label: string } =>
      Boolean(entry.label),
    );
  const actionError =
    flowState.formError ||
    (candidacyActionScope === currentActionScope
      ? candidacyState.formError
      : null) ||
    (voteActionScope === currentActionScope ? voteState.formError : null) ||
    (nightActionScope === currentActionScope ? nightState.formError : null);
  const actionNotice =
    (candidacyActionScope === currentActionScope
      ? candidacyState.formNotice
      : null) ||
    (voteActionScope === currentActionScope ? voteState.formNotice : null) ||
    (nightActionScope === currentActionScope ? nightState.formNotice : null);
  const visibleFactionAlert =
    flow.factionAlert?.id === dismissedFactionAlertId
      ? null
      : flow.factionAlert;

  const updateFactionAlertDrag = (offset: number) => {
    const nextOffset = Math.max(0, offset);
    factionAlertDragYRef.current = nextOffset;
    setFactionAlertDragY(nextOffset);
  };

  useEffect(() => {
    if (
      nightActionScope === currentActionScope &&
      nightState.formNotice?.startsWith("SEER_RESULT:")
    ) {
      const [, result, target] = nightState.formNotice.split(":");
      const targetSeatNumber = Number(target);

      if (result && Number.isInteger(targetSeatNumber)) {
        setSeerNotice(
          getSeerResultNotice({
            locale,
            result,
            targetSeatNumber,
            thirdPartyLabel: t.thirdParty,
          }),
        );
      }
      setOpen(true);
    }
  }, [
    currentActionScope,
    locale,
    nightActionScope,
    nightState.formNotice,
    t.thirdParty,
  ]);

  useEffect(() => {
    setSeerNotice(null);
  }, [flow.cueIndex, flow.sessionIndex]);

  useEffect(() => {
    if (
      roomStatus !== "IN_PROGRESS" ||
      !shouldAutoOpenPlayerAction ||
      autoOpenedPlayerActionScopeRef.current === currentActionScope
    ) {
      return;
    }

    autoOpenedPlayerActionScopeRef.current = currentActionScope;
    setTab("flow");
    setOpen(true);
  }, [currentActionScope, roomStatus, shouldAutoOpenPlayerAction]);

  useEffect(() => {
    const submittedState = factionAlertDismissStateRef.current;

    if (!submittedState || submittedState === flowState) {
      return;
    }

    factionAlertDismissStateRef.current = null;

    if (flowState.formError) {
      setDismissedFactionAlertId(null);
    }
  }, [flowState]);

  if (roomStatus !== "IN_PROGRESS") {
    return null;
  }

  const stageLabel =
    t.stages[flow.stage as keyof typeof t.stages] ?? flow.stage;
  const suggestedSeat = flow.suggestedSeatNumber
    ? seats.find((seat) => seat.seatNumber === flow.suggestedSeatNumber)
    : null;
  const renderTargetSelect = (includeAbstain = false) => (
    <select
      className="h-11 w-full rounded-lg border border-[#D6D5B2] bg-white px-3 text-sm font-semibold text-[#18362D] outline-none focus:border-[#2F7757]"
      defaultValue=""
      name="targetSeatNumber"
      required
    >
      <option disabled value="">
        {t.selectTarget}
      </option>
      {includeAbstain ? <option value="0">{t.abstain}</option> : null}
      {voteTargets.map((targetSeatNumber) => {
        const target = seats.find(
          (seat) => seat.seatNumber === targetSeatNumber,
        );
        return target ? (
          <option key={target.seatNumber} value={target.seatNumber}>
            {target.seatNumber}. {target.displayName}
          </option>
        ) : null;
      })}
    </select>
  );

  return (
    <>
      <button
        aria-label={`${isJudge ? t.flow : t.currentFlow}: ${stageLabel}`}
        className={`z-[96] grid h-14 grid-cols-[2.25rem_minmax(0,1fr)_1.5rem] items-center gap-3 rounded-2xl border border-white/80 bg-[#F1F2E3] px-3 text-[#153B31] shadow-[0_16px_44px_rgba(0,0,0,0.46)] transition hover:bg-white active:scale-[0.98] ${
          inlineTrigger
            ? "relative w-full"
            : "fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 w-[min(calc(100vw-1.5rem),22rem)] -translate-x-1/2 md:bottom-5 md:left-auto md:right-5 md:w-[16rem] md:translate-x-0"
        }`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#153B31] text-[#F1F2E3] shadow-[0_5px_14px_rgba(21,59,49,0.28)]">
          <ClipboardList className="h-4 w-4" />
        </span>
        <span className="min-w-0 text-left leading-none">
          <span className="block text-[10px] font-bold text-[#607069]">
            {isJudge ? t.flow : t.currentFlow}
          </span>
          <span className="mt-1 block truncate text-sm font-bold">
            {stageLabel}
          </span>
        </span>
        <ChevronUp className="h-5 w-5" />
      </button>

      {visibleFactionAlert && isJudge ? (
        <div className="fixed inset-0 z-[130] grid place-items-end bg-black/52 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm md:place-items-center">
          <form
            action={flowAction}
            className="w-full max-w-sm rounded-t-2xl bg-[#FFFDF7] p-5 text-[#18362D] shadow-[0_22px_70px_rgba(0,0,0,0.38)] md:rounded-2xl"
            onSubmit={() => {
              factionAlertDismissStateRef.current = flowState;
              setDismissedFactionAlertId(visibleFactionAlert.id);
            }}
            ref={factionAlertFormRef}
            style={{
              transform: `translateY(${factionAlertDragY}px)`,
              transition:
                factionAlertDragStartYRef.current === null
                  ? "transform 180ms ease-out"
                  : "none",
            }}
          >
            <input name="locale" type="hidden" value={locale} />
            <input name="privateToken" type="hidden" value={privateToken} />
            <input name="operation" type="hidden" value="dismiss_alert" />
            <div
              aria-label={t.close}
              className="mx-auto mb-4 grid h-7 w-20 touch-none place-items-center md:hidden"
              onPointerCancel={() => {
                factionAlertDragStartYRef.current = null;
                updateFactionAlertDrag(0);
              }}
              onPointerDown={(event) => {
                factionAlertDragStartYRef.current = event.clientY;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  factionAlertFormRef.current?.requestSubmit();
                }
              }}
              onPointerMove={(event) => {
                if (factionAlertDragStartYRef.current === null) {
                  return;
                }

                updateFactionAlertDrag(
                  event.clientY - factionAlertDragStartYRef.current,
                );
              }}
              onPointerUp={(event) => {
                const shouldDismiss = factionAlertDragYRef.current >= 72;
                factionAlertDragStartYRef.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                updateFactionAlertDrag(0);

                if (shouldDismiss) {
                  factionAlertFormRef.current?.requestSubmit();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="h-1 w-12 rounded-full bg-[#C8C9B4]" />
            </div>
            <ShieldAlert className="h-7 w-7 text-[#9B2433]" />
            <h2 className="mt-3 text-lg font-bold">
              {t.factionAlerts[visibleFactionAlert.kind]}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66706C]">
              {localizeWerewolfFlowText(locale, {
                "zh-CN":
                  "系统只做提醒，不会自动结束游戏。请法官确认现场情况后选择胜利阵营。",
                en: "This is an alert only. The judge still confirms the winning faction.",
                fr: "Ceci est uniquement une alerte. Le maître confirme toujours le camp vainqueur.",
              })}
            </p>
            <SubmitButton className="mt-5 h-11 w-full rounded-full bg-[#18362D] text-sm font-bold text-white">
              {t.close}
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-end bg-black/52 backdrop-blur-[2px] md:items-center md:justify-center md:p-5"
          onMouseDown={() => setOpen(false)}
          role="presentation"
        >
          <section
            aria-modal="true"
            className="max-h-[82svh] w-full overflow-hidden rounded-t-2xl bg-[#FFFDF7] text-[#18362D] shadow-[0_-18px_70px_rgba(0,0,0,0.36)] md:max-w-lg md:rounded-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center gap-3 border-b border-[#E5E2D3] px-4 pb-3 pt-3">
              <button
                aria-label={t.close}
                className="grid h-9 w-9 place-items-center rounded-full text-[#58645F]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{stageLabel}</p>
                <p className="text-[11px] font-semibold text-[#7B8581]">
                  {localizeWerewolfFlowText(locale, {
                    "zh-CN": `第 ${flow.dayNumber} 天`,
                    en: `Day ${flow.dayNumber}`,
                    fr: `Jour ${flow.dayNumber}`,
                  })}
                </p>
              </div>
              <button
                aria-label={t.close}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#D6D5B2]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 border-b border-[#E5E2D3] px-4">
              <button
                className={`h-11 border-b-2 text-sm font-bold ${tab === "flow" ? "border-[#2F7757] text-[#1F6E4C]" : "border-transparent text-[#75807B]"}`}
                onClick={() => setTab("flow")}
                type="button"
              >
                {isJudge ? t.flow : t.currentFlow}
              </button>
              <button
                className={`h-11 border-b-2 text-sm font-bold ${tab === "records" ? "border-[#2F7757] text-[#1F6E4C]" : "border-transparent text-[#75807B]"}`}
                onClick={() => setTab("records")}
                type="button"
              >
                {isJudge ? t.records : t.playerRecords}
              </button>
            </div>

            <div className="max-h-[calc(82svh-7.75rem)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5">
              {tab === "records" ? (
                <div>
                  {isJudge &&
                  submissions.some(
                    (submission) => submission.kind === "WEREWOLF_NIGHT_ACTION",
                  ) ? (
                    <div className="mb-4 border-b border-[#E5E2D3] pb-4">
                      <p className="mb-2 text-xs font-bold text-[#1F6E4C]">
                        {localizeWerewolfFlowText(locale, {
                          "zh-CN": "法官可见 · 夜间记录",
                          en: "Judge only · Night history",
                          fr: "Maître uniquement · Historique de nuit",
                        })}
                      </p>
                      <div className="divide-y divide-[#E5E2D3]">
                        {submissions
                          .filter(
                            (submission) =>
                              submission.kind === "WEREWOLF_NIGHT_ACTION",
                          )
                          .map((submission, index) => (
                            <div
                              className="flex items-center justify-between gap-3 py-2 text-sm"
                              key={`${submission.roundIndex}-${submission.voterSeatNumber}-${index}`}
                            >
                              <span className="font-semibold">
                                {getWerewolfNightActionLabel(
                                  submission.actionKind,
                                  locale,
                                )}
                              </span>
                              <span className="font-bold text-[#1F6E4C]">
                                {submission.targetSeatNumber
                                  ? formatWerewolfSeatLabel(
                                      submission.targetSeatNumber,
                                      locale,
                                    )
                                  : "-"}
                                {submission.secondaryTargetSeatNumber
                                  ? ` + ${formatWerewolfSeatLabel(
                                      submission.secondaryTargetSeatNumber,
                                      locale,
                                    )}`
                                  : ""}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="divide-y divide-[#E5E2D3]">
                    {records.length ? (
                      records.map(({ event, label }) => (
                        <div
                          className="flex items-start gap-3 py-3"
                          key={event.id}
                        >
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2F7757]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="mt-1 text-[11px] text-[#7B8581]">
                              {new Date(event.createdAt).toLocaleTimeString(
                                locale,
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-[#7B8581]">
                        {t.noVote}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {currentCue ? (
                    <div className="border-l-2 border-[#2F7757] pl-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#1F6E4C]">
                        <Moon className="h-4 w-4" />
                        {currentCue.title}
                      </div>
                      <div className="mt-3 space-y-2">
                        {currentCue.lines.map((line) => (
                          <p
                            className="text-base font-bold leading-7"
                            key={line}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 border-l-2 border-[#C8C9B4] pl-4">
                      {flow.stage.includes("VOTE") ? (
                        <Vote className="mt-0.5 h-5 w-5" />
                      ) : (
                        <Sunrise className="mt-0.5 h-5 w-5" />
                      )}
                      <div>
                        <p className="font-bold">{stageLabel}</p>
                        {suggestedSeat &&
                        shouldShowWerewolfSuggestedSeat(flow.stage) ? (
                          <p className="mt-2 text-sm font-semibold text-[#9B2433]">
                            {localizeWerewolfFlowText(locale, {
                              "zh-CN": `结果：${formatWerewolfSeatLabel(suggestedSeat.seatNumber, locale)} ${suggestedSeat.displayName}`,
                              en: `Result: ${formatWerewolfSeatLabel(suggestedSeat.seatNumber, locale)} ${suggestedSeat.displayName}`,
                              fr: `Résultat : ${formatWerewolfSeatLabel(suggestedSeat.seatNumber, locale)} ${suggestedSeat.displayName}`,
                            })}
                          </p>
                        ) : flow.stage.endsWith("RESULT") ? (
                          <p className="mt-2 text-sm font-semibold text-[#66706C]">
                            {localizeWerewolfFlowText(locale, {
                              "zh-CN": "第二轮仍平票，无人当选或出局。",
                              en: "The second vote tied. No one is selected.",
                              fr: "Le second vote est à égalité. Personne n'est élu ou éliminé.",
                            })}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {isJudge ? (
                    <>
                      {activeSubmissions.length ? (
                        <div className="divide-y divide-[#E5E2D3] border-y border-[#E5E2D3]">
                          {activeSubmissions.map((submission, index) => (
                            <div
                              className="flex items-center justify-between gap-3 py-2.5 text-sm"
                              key={`${submission.kind}-${submission.voterSeatNumber}-${index}`}
                            >
                              <span className="font-semibold">
                                {submission.kind === "WEREWOLF_NIGHT_ACTION"
                                  ? getWerewolfNightActionLabel(
                                      submission.actionKind,
                                      locale,
                                    )
                                  : submission.voterSeatNumber
                                    ? formatWerewolfSeatLabel(
                                        submission.voterSeatNumber,
                                        locale,
                                      )
                                    : "-"}
                              </span>
                              <span className="font-bold text-[#1F6E4C]">
                                {submission.targetSeatNumber
                                  ? formatWerewolfSeatLabel(
                                      submission.targetSeatNumber,
                                      locale,
                                    )
                                  : t.abstain}
                                {submission.secondaryTargetSeatNumber
                                  ? ` + ${formatWerewolfSeatLabel(
                                      submission.secondaryTargetSeatNumber,
                                      locale,
                                    )}`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {flow.stage === "NIGHT" &&
                      (nightResolution || witchPoisonTargetSeatNumber) ? (
                        <div className="rounded-lg bg-[#F2EFE4] px-3 py-2 text-sm font-bold leading-6 text-[#5A4B2E]">
                          {nightResolution ? <p>{nightResolution}</p> : null}
                          {witchPoisonTargetSeatNumber ? (
                            <p>
                              {localizeWerewolfFlowText(locale, {
                                "zh-CN": `毒药目标：${formatWerewolfSeatLabel(witchPoisonTargetSeatNumber, locale)}。`,
                                en: `Poison target: ${formatWerewolfSeatLabel(witchPoisonTargetSeatNumber, locale)}.`,
                                fr: `Cible du poison : ${formatWerewolfSeatLabel(witchPoisonTargetSeatNumber, locale)}.`,
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2">
                        {flow.stage === "NIGHT" && flow.cueIndex > 0 ? (
                          <form action={flowAction}>
                            <input name="locale" type="hidden" value={locale} />
                            <input
                              name="privateToken"
                              type="hidden"
                              value={privateToken}
                            />
                            <input
                              name="operation"
                              type="hidden"
                              value="previous_cue"
                            />
                            <SubmitButton className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-full border border-[#C8C9B4] bg-white text-sm font-bold">
                              <ChevronLeft className="h-4 w-4" /> {t.previous}
                            </SubmitButton>
                          </form>
                        ) : (
                          <span />
                        )}
                        {isVoteStage ? (
                          <form action={flowAction}>
                            <input name="locale" type="hidden" value={locale} />
                            <input
                              name="privateToken"
                              type="hidden"
                              value={privateToken}
                            />
                            <input
                              name="operation"
                              type="hidden"
                              value="resolve_vote"
                            />
                            <SubmitButton className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-full bg-[#1F6E4C] px-3 text-sm font-bold text-white">
                              {t.resolveVote}
                            </SubmitButton>
                          </form>
                        ) : (
                          <form action={flowAction}>
                            <input name="locale" type="hidden" value={locale} />
                            <input
                              name="privateToken"
                              type="hidden"
                              value={privateToken}
                            />
                            <input
                              name="operation"
                              type="hidden"
                              value="next"
                            />
                            <SubmitButton className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-full bg-[#1F6E4C] px-3 text-sm font-bold text-white">
                              {t.next} <ChevronRight className="h-4 w-4" />
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </>
                  ) : (
                    <PlayerFlowAction
                      activeCandidates={activeCandidates}
                      actionNotice={actionNotice ?? undefined}
                      canAct={viewerCanAct}
                      canVote={canVote}
                      candidacyAction={scopedCandidacyAction}
                      currentCue={currentCue}
                      flow={flow}
                      isExileVote={isExileVote}
                      locale={locale}
                      nightAction={scopedNightAction}
                      ownSubmission={ownSubmission}
                      privateToken={privateToken}
                      renderTargetSelect={renderTargetSelect}
                      roleKey={roleKey}
                      seatNumber={seatNumber}
                      seerNotice={seerNotice ?? persistedSeerNotice}
                      seats={aliveSeats}
                      t={t}
                      voteAction={scopedVoteAction}
                      wolfAttackSeatNumber={wolfAttackSeatNumber ?? null}
                    />
                  )}

                  {actionError ? (
                    <p className="rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm font-bold text-[#9B2433]">
                      {actionError}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function PlayerFlowAction({
  activeCandidates,
  actionNotice,
  canAct,
  canVote,
  candidacyAction,
  currentCue,
  flow,
  isExileVote,
  locale,
  nightAction,
  ownSubmission,
  privateToken,
  renderTargetSelect,
  roleKey,
  seatNumber,
  seerNotice,
  seats,
  t,
  voteAction,
  wolfAttackSeatNumber,
}: {
  activeCandidates: number[];
  actionNotice?: string;
  canAct: boolean;
  canVote: boolean;
  candidacyAction: (payload: FormData) => void;
  currentCue: ReturnType<typeof getWerewolfNightCues>[number] | null;
  flow: WerewolfFlowState;
  isExileVote: boolean;
  locale: string;
  nightAction: (payload: FormData) => void;
  ownSubmission: boolean;
  privateToken: string;
  renderTargetSelect: (includeAbstain?: boolean) => React.ReactNode;
  roleKey: WerewolfRoleKey | null;
  seatNumber: number;
  seerNotice: string | null;
  seats: FlowSeat[];
  t: ReturnType<typeof getCopy>;
  voteAction: (payload: FormData) => void;
  wolfAttackSeatNumber: number | null;
}) {
  const isCandidate = flow.candidateSeatNumbers.includes(seatNumber);
  const isWithdrawn = flow.withdrawnSeatNumbers.includes(seatNumber);
  const isLover = flow.loverSeatNumbers.includes(seatNumber);
  const canActAtNight =
    canAct &&
    currentCue &&
    ((currentCue.actionKind === "CUPID" && roleKey === "cupid") ||
      (currentCue.actionKind === "GUARD" && roleKey === "guard") ||
      (currentCue.actionKind === "LOVERS" && isLover) ||
      (currentCue.actionKind === "SEER" && roleKey === "seer") ||
      (currentCue.actionKind === "WITCH" && roleKey === "witch") ||
      (currentCue.actionKind === "WOLF_KILL" &&
        ["werewolf", "wolf_king", "white_wolf_king"].includes(roleKey ?? "")));

  if (canAct && flow.stage === "SHERIFF_SIGNUP" && !isCandidate) {
    return (
      <form action={candidacyAction}>
        <input name="locale" type="hidden" value={locale} />
        <input name="privateToken" type="hidden" value={privateToken} />
        <input name="operation" type="hidden" value="join" />
        <SubmitButton className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1F6E4C] text-sm font-bold text-white">
          <Crown className="h-4 w-4" /> {t.candidate}
        </SubmitButton>
      </form>
    );
  }

  if (
    canAct &&
    flow.stage === "SHERIFF_WITHDRAW" &&
    isCandidate &&
    !isWithdrawn
  ) {
    return (
      <form action={candidacyAction}>
        <input name="locale" type="hidden" value={locale} />
        <input name="privateToken" type="hidden" value={privateToken} />
        <input name="operation" type="hidden" value="withdraw" />
        <SubmitButton className="h-11 w-full rounded-full border border-[#9B2433]/35 bg-white text-sm font-bold text-[#9B2433]">
          {t.withdraw}
        </SubmitButton>
      </form>
    );
  }

  if (canVote) {
    return (
      <form action={voteAction} className="space-y-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="privateToken" type="hidden" value={privateToken} />
        {renderTargetSelect(isExileVote)}
        <SubmitButton className="h-11 w-full rounded-full bg-[#1F6E4C] text-sm font-bold text-white">
          {t.vote}
        </SubmitButton>
      </form>
    );
  }

  if (ownSubmission || actionNotice) {
    const savedNotice =
      currentCue?.actionKind === "WOLF_KILL" && wolfAttackSeatNumber
        ? locale === "zh-CN"
          ? `已确认：${wolfAttackSeatNumber}号`
          : locale === "fr"
            ? `Confirmé : siège ${wolfAttackSeatNumber}`
            : `Confirmed: seat ${wolfAttackSeatNumber}`
        : t.actionSaved;

    return (
      <p className="rounded-lg bg-[#E5F3E9] px-3 py-2 text-center text-sm font-bold text-[#1F6E4C]">
        {seerNotice ?? savedNotice}
      </p>
    );
  }

  if (!canActAtNight || !currentCue) {
    const candidates = activeCandidates
      .map((seatNumber) => formatWerewolfSeatLabel(seatNumber, locale))
      .join(locale === "zh-CN" ? "、" : ", ");
    return candidates ? (
      <p className="text-center text-sm font-semibold text-[#66706C]">
        {localizeWerewolfFlowText(locale, {
          "zh-CN": `候选人：${candidates}`,
          en: `Candidates: ${candidates}`,
          fr: `Candidats : ${candidates}`,
        })}
      </p>
    ) : null;
  }

  const actionKind = currentCue.actionKind;
  const targetOptions = seats
    .filter((seat) => seat.isActive && seat.isPlayerSeat && !seat.isDead)
    .map((seat) => (
      <option key={seat.seatNumber} value={seat.seatNumber}>
        {seat.seatNumber}. {seat.displayName}
      </option>
    ));

  if (actionKind === "WITCH") {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm font-bold text-[#9B2433]">
          {wolfAttackSeatNumber
            ? localizeWerewolfFlowText(locale, {
                "zh-CN": `今晚 ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)}被袭击`,
                en: `${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} was attacked tonight`,
                fr: `Le ${formatWerewolfSeatLabel(wolfAttackSeatNumber, locale)} a été attaqué cette nuit`,
              })
            : localizeWerewolfFlowText(locale, {
                "zh-CN": "今晚狼人未确认击杀目标",
                en: "No confirmed attack target tonight",
                fr: "Aucune cible d'attaque confirmée cette nuit",
              })}
        </p>
        {canUseWerewolfAntidote({
          hasWolfKill: Boolean(wolfAttackSeatNumber),
          isAntidoteUsed: flow.witchAntidoteUsed,
        }) ? (
          <form action={nightAction}>
            <input name="actionKind" type="hidden" value="WITCH_ANTIDOTE" />
            <input name="locale" type="hidden" value={locale} />
            <input name="privateToken" type="hidden" value={privateToken} />
            <SubmitButton className="h-11 w-full rounded-full bg-[#1F6E4C] text-sm font-bold text-white">
              {t.antidote}
            </SubmitButton>
          </form>
        ) : null}
        {!flow.witchPoisonUsed ? (
          <form
            action={nightAction}
            className="grid grid-cols-[1fr_auto] gap-2"
          >
            <input name="actionKind" type="hidden" value="WITCH_POISON" />
            <input name="locale" type="hidden" value={locale} />
            <input name="privateToken" type="hidden" value={privateToken} />
            <select
              className="h-11 rounded-lg border border-[#D6D5B2] bg-white px-3 text-sm font-semibold"
              defaultValue=""
              name="targetSeatNumber"
              required
            >
              <option disabled value="">
                {t.selectTarget}
              </option>
              {targetOptions}
            </select>
            <SubmitButton className="h-11 rounded-full bg-[#9B2433] px-4 text-sm font-bold text-white">
              {t.poison}
            </SubmitButton>
          </form>
        ) : null}
        <form action={nightAction}>
          <input name="actionKind" type="hidden" value="WITCH_PASS" />
          <input name="locale" type="hidden" value={locale} />
          <input name="privateToken" type="hidden" value={privateToken} />
          <SubmitButton className="h-10 w-full rounded-full border border-[#C8C9B4] bg-white text-sm font-bold">
            {t.pass}
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (actionKind === "LOVERS") {
    return (
      <form action={nightAction}>
        <input name="actionKind" type="hidden" value="LOVERS" />
        <input name="locale" type="hidden" value={locale} />
        <input name="privateToken" type="hidden" value={privateToken} />
        <SubmitButton className="h-11 w-full rounded-full bg-[#1F6E4C] text-sm font-bold text-white">
          {t.confirm}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={nightAction} className="space-y-3">
      <input name="actionKind" type="hidden" value={actionKind} />
      <input name="locale" type="hidden" value={locale} />
      <input name="privateToken" type="hidden" value={privateToken} />
      <select
        className="h-11 w-full rounded-lg border border-[#D6D5B2] bg-white px-3 text-sm font-semibold"
        defaultValue=""
        name="targetSeatNumber"
        required
      >
        <option disabled value="">
          {t.selectTarget}
        </option>
        {targetOptions}
      </select>
      {actionKind === "CUPID" ? (
        <select
          className="h-11 w-full rounded-lg border border-[#D6D5B2] bg-white px-3 text-sm font-semibold"
          defaultValue=""
          name="secondaryTargetSeatNumber"
          required
        >
          <option disabled value="">
            {t.selectTarget}
          </option>
          {targetOptions}
        </select>
      ) : null}
      <SubmitButton className="h-11 w-full rounded-full bg-[#1F6E4C] text-sm font-bold text-white">
        {t.confirm}
      </SubmitButton>
    </form>
  );
}
