"use client";

import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Moon,
  ShieldAlert,
  Sunrise,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateWerewolfFlowAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import {
  formatWerewolfSeatLabel,
  getWerewolfFlowRecordLabel,
  getWerewolfNightActionLabel,
  getWerewolfNightCues,
  localizeWerewolfFlowText,
  type WerewolfFlowState,
} from "@/features/game-tools/werewolfFlow";
import {
  getWerewolfRoleCopy,
  werewolfExtendedRoleKeys,
} from "@/features/game-tools/werewolfConfig";

type FlowEvent = {
  createdAt: string;
  id: string;
  payload?: unknown;
  type: string;
};

type FlowSubmission = {
  actionKind: string | null;
  kind: string;
  roundIndex: number;
  secondaryTargetSeatNumber: number | null;
  targetSeatNumber: number | null;
  voterSeatNumber: number | null;
};

type WerewolfFlowPanelProps = {
  events: FlowEvent[];
  flow: WerewolfFlowState;
  inlineTrigger?: boolean;
  isJudge: boolean;
  locale: string;
  privateToken: string;
  roleDeck: Array<string | null>;
  roomStatus: string;
  submissions: FlowSubmission[];
};

const initialState: WerewolfRoomActionState = {};

function DismissButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-5 h-11 w-full rounded-full bg-[#18362D] text-sm font-bold text-white disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {children}
    </button>
  );
}

export function WerewolfFlowPanel({
  events,
  flow,
  inlineTrigger = false,
  isJudge,
  locale,
  privateToken,
  roleDeck,
  roomStatus,
  submissions,
}: WerewolfFlowPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"flow" | "records">("flow");
  const [flowState, flowAction] = useActionState(
    updateWerewolfFlowAction,
    initialState,
  );
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);
  const [alertDragY, setAlertDragY] = useState(0);
  const alertDragStartRef = useRef<number | null>(null);
  const alertDragYRef = useRef(0);
  const alertFormRef = useRef<HTMLFormElement>(null);
  const t = {
    close: localizeWerewolfFlowText(locale, {
      "zh-CN": "收起",
      en: "Close",
      fr: "Fermer",
    }),
    day: localizeWerewolfFlowText(locale, {
      "zh-CN": "白天",
      en: "Daytime",
      fr: "Journée",
    }),
    firstNight: localizeWerewolfFlowText(locale, {
      "zh-CN": "首夜",
      en: "First night",
      fr: "Première nuit",
    }),
    flow: localizeWerewolfFlowText(locale, {
      "zh-CN": "法官手卡",
      en: "Judge cue card",
      fr: "Aide-mémoire du maître",
    }),
    night: localizeWerewolfFlowText(locale, {
      "zh-CN": "每晚",
      en: "Each night",
      fr: "Chaque nuit",
    }),
    records: localizeWerewolfFlowText(locale, {
      "zh-CN": "本局记录",
      en: "Game records",
      fr: "Historique de la partie",
    }),
    laterNight: localizeWerewolfFlowText(locale, {
      "zh-CN": "之后每晚",
      en: "Following nights",
      fr: "Nuits suivantes",
    }),
    extendedRoles: localizeWerewolfFlowText(locale, {
      "zh-CN": "本板子扩展身份",
      en: "Additional roles in this setup",
      fr: "Rôles supplémentaires de cette composition",
    }),
  };
  const firstNightCues = getWerewolfNightCues(roleDeck, 1, locale);
  const laterNightCues = getWerewolfNightCues(roleDeck, 2, locale);
  const hasFirstNightOnlyCues = firstNightCues.some(
    (cue) => !laterNightCues.some((laterCue) => laterCue.key === cue.key),
  );
  const roleCopy = getWerewolfRoleCopy(locale);
  const extendedRoles = werewolfExtendedRoleKeys.filter((role) =>
    roleDeck.includes(role),
  );
  const records = events.flatMap((event) => {
    if (
      event.type.startsWith("werewolf_sheriff_candidate_") ||
      event.type.endsWith("vote_resolved")
    ) {
      return [];
    }

    const label = getWerewolfFlowRecordLabel(event, locale);
    return label ? [{ event, label }] : [];
  });
  const visibleAlert =
    isJudge && flow.factionAlert?.id !== dismissedAlertId
      ? flow.factionAlert
      : null;

  useEffect(() => {
    if (flowState.formError) {
      setDismissedAlertId(null);
    }
  }, [flowState]);

  if (roomStatus !== "IN_PROGRESS") {
    return null;
  }

  const moveAlert = (offset: number) => {
    const next = Math.max(0, offset);
    alertDragYRef.current = next;
    setAlertDragY(next);
  };

  const renderCues = (cues: ReturnType<typeof getWerewolfNightCues>) => (
    <div className="space-y-5">
      {cues.map((cue) => (
        <div className="border-l-2 border-[#2F7757] pl-4" key={cue.key}>
          <p className="text-xs font-bold text-[#1F6E4C]">{cue.title}</p>
          <div className="mt-2 space-y-1">
            {cue.lines.map((line) => (
              <p className="text-sm font-semibold leading-6" key={line}>
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button
        aria-label={isJudge ? t.flow : t.records}
        className={`z-[96] grid h-14 grid-cols-[2.25rem_minmax(0,1fr)_1.5rem] items-center gap-3 rounded-2xl border border-white/80 bg-[#F1F2E3] px-3 text-[#153B31] shadow-[0_16px_44px_rgba(0,0,0,0.46)] transition hover:bg-white active:scale-[0.98] ${
          inlineTrigger
            ? "relative w-full"
            : "fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 w-[min(calc(100vw-1.5rem),22rem)] -translate-x-1/2 md:bottom-5 md:left-auto md:right-5 md:w-[16rem] md:translate-x-0"
        }`}
        onClick={() => {
          setTab(isJudge ? "flow" : "records");
          setOpen(true);
        }}
        type="button"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#153B31] text-[#F1F2E3] shadow-[0_5px_14px_rgba(21,59,49,0.28)]">
          <ClipboardList className="h-4 w-4" />
        </span>
        <span className="min-w-0 text-left text-sm font-bold">
          {isJudge ? t.flow : t.records}
        </span>
        <ChevronUp className="h-5 w-5" />
      </button>

      {visibleAlert ? (
        <div className="fixed inset-0 z-[130] grid place-items-end bg-black/52 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm md:place-items-center">
          <form
            action={flowAction}
            className="w-full max-w-sm rounded-t-2xl bg-[#FFFDF7] p-5 text-[#18362D] shadow-[0_22px_70px_rgba(0,0,0,0.38)] md:rounded-2xl"
            onSubmit={() => setDismissedAlertId(visibleAlert.id)}
            ref={alertFormRef}
            style={{
              transform: `translateY(${alertDragY}px)`,
              transition:
                alertDragStartRef.current === null
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
                alertDragStartRef.current = null;
                moveAlert(0);
              }}
              onPointerDown={(event) => {
                alertDragStartRef.current = event.clientY;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (alertDragStartRef.current !== null) {
                  moveAlert(event.clientY - alertDragStartRef.current);
                }
              }}
              onPointerUp={(event) => {
                const shouldDismiss = alertDragYRef.current >= 72;
                alertDragStartRef.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                moveAlert(0);
                if (shouldDismiss) alertFormRef.current?.requestSubmit();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  alertFormRef.current?.requestSubmit();
                }
              }}
            >
              <span className="h-1 w-12 rounded-full bg-[#C8C9B4]" />
            </div>
            <ShieldAlert className="h-7 w-7 text-[#9B2433]" />
            <h2 className="mt-3 text-lg font-bold">
              {localizeWerewolfFlowText(locale, {
                "zh-CN": {
                  GODS_ELIMINATED: "神职阵营玩家已全部死亡",
                  THIRD_PARTY_WIN: "场上仅剩第三方阵营",
                  VILLAGERS_ELIMINATED: "平民阵营玩家已全部死亡",
                  WEREWOLVES_ELIMINATED: "狼人阵营玩家已全部死亡",
                }[visibleAlert.kind],
                en: {
                  GODS_ELIMINATED: "All special good roles are eliminated",
                  THIRD_PARTY_WIN: "Only the third party remains",
                  VILLAGERS_ELIMINATED: "All villagers are eliminated",
                  WEREWOLVES_ELIMINATED: "All werewolves are eliminated",
                }[visibleAlert.kind],
                fr: {
                  GODS_ELIMINATED: "Tous les rôles spéciaux sont éliminés",
                  THIRD_PARTY_WIN: "Seul le troisième camp reste en jeu",
                  VILLAGERS_ELIMINATED: "Tous les villageois sont éliminés",
                  WEREWOLVES_ELIMINATED: "Tous les loups sont éliminés",
                }[visibleAlert.kind],
              })}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#66706C]">
              {localizeWerewolfFlowText(locale, {
                "zh-CN":
                  "系统只做提醒，不会自动结束游戏。请法官确认现场情况后选择胜利阵营。",
                en: "This is an alert only. The judge still confirms the winning faction.",
                fr: "Ceci est uniquement une alerte. Le maître confirme toujours le camp vainqueur.",
              })}
            </p>
            {flowState.formError ? (
              <p className="mt-2 text-sm text-[#9B2433]">
                {flowState.formError}
              </p>
            ) : null}
            <DismissButton>{t.close}</DismissButton>
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
            aria-label={isJudge ? t.flow : t.records}
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
              <p className="min-w-0 flex-1 truncate text-sm font-bold">
                {isJudge ? t.flow : t.records}
              </p>
              <button
                aria-label={t.close}
                className="grid h-9 w-9 place-items-center rounded-full border border-[#D6D5B2]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isJudge ? (
              <div className="grid grid-cols-2 border-b border-[#E5E2D3] px-4">
                <button
                  className={`h-11 border-b-2 text-sm font-bold ${tab === "flow" ? "border-[#2F7757] text-[#1F6E4C]" : "border-transparent text-[#75807B]"}`}
                  onClick={() => setTab("flow")}
                  type="button"
                >
                  {t.flow}
                </button>
                <button
                  className={`h-11 border-b-2 text-sm font-bold ${tab === "records" ? "border-[#2F7757] text-[#1F6E4C]" : "border-transparent text-[#75807B]"}`}
                  onClick={() => setTab("records")}
                  type="button"
                >
                  {t.records}
                </button>
              </div>
            ) : null}

            <div className="max-h-[calc(82svh-7.75rem)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5">
              {isJudge && tab === "flow" ? (
                <div className="space-y-8">
                  <section>
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#153B31]">
                      <Moon className="h-4 w-4" />
                      {hasFirstNightOnlyCues ? t.firstNight : t.night}
                    </h3>
                    {renderCues(firstNightCues)}
                  </section>
                  <section className="border-t border-[#E5E2D3] pt-6">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#153B31]">
                      <Sunrise className="h-4 w-4" />
                      {t.day}
                    </h3>
                    <div className="border-l-2 border-[#2F7757] pl-4 text-sm font-semibold leading-7">
                      <p>
                        {localizeWerewolfFlowText(locale, {
                          "zh-CN": "宣布昨夜死讯，标记出局玩家。",
                          en: "Announce deaths from the night and mark eliminated players.",
                          fr: "Annoncez les morts de la nuit et marquez les joueurs éliminés.",
                        })}
                      </p>
                      <p>
                        {localizeWerewolfFlowText(locale, {
                          "zh-CN": "组织玩家发言，按现场规则继续游戏。",
                          en: "Lead the discussion and continue by the table's rules.",
                          fr: "Animez les prises de parole et poursuivez selon les règles de la table.",
                        })}
                      </p>
                      <p>
                        {localizeWerewolfFlowText(locale, {
                          "zh-CN": "标记出局玩家；确认胜利阵营后结束本局。",
                          en: "Mark eliminated players; end the game after confirming the winning faction.",
                          fr: "Marquez les joueurs éliminés ; terminez la partie après avoir confirmé le camp vainqueur.",
                        })}
                      </p>
                    </div>
                  </section>
                  {hasFirstNightOnlyCues ? (
                    <section className="border-t border-[#E5E2D3] pt-6">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#153B31]">
                        <Moon className="h-4 w-4" />
                        {t.laterNight}
                      </h3>
                      {renderCues(laterNightCues)}
                    </section>
                  ) : null}
                  {extendedRoles.length ? (
                    <section className="border-t border-[#E5E2D3] pt-6">
                      <h3 className="mb-4 text-sm font-bold text-[#153B31]">
                        {t.extendedRoles}
                      </h3>
                      <div className="space-y-4">
                        {extendedRoles.map((role) => (
                          <div className="border-l-2 border-[#2F7757] pl-4" key={role}>
                            <p className="text-xs font-bold text-[#1F6E4C]">
                              {roleCopy.roleLabels[role]}
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-6">
                              {roleCopy.roleDescriptions[role]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : (
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
                                  ? ` + ${formatWerewolfSeatLabel(submission.secondaryTargetSeatNumber, locale)}`
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
                        {localizeWerewolfFlowText(locale, {
                          "zh-CN": "暂无记录",
                          en: "No records yet",
                          fr: "Aucun historique",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
