"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DdzRoundSummary } from "../doudizhuRoomTypes";
import { getDoudizhuCopy } from "../doudizhuCopy";
import { DoudizhuDialog } from "./DoudizhuChrome";
import s from "./DoudizhuGame.module.css";

export function DoudizhuHistoryDialog({
  locale,
  onClose,
  onLoad,
}: {
  locale: string;
  onClose: () => void;
  onLoad?: () => Promise<DdzRoundSummary[]>;
}) {
  const t = getDoudizhuCopy(locale);
  const [rounds, setRounds] = useState<DdzRoundSummary[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  const loader = useRef(onLoad),
    request = useRef(0);
  loader.current = onLoad;
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setFailed(false);
    try {
      const next = (await loader.current?.()) ?? [];
      if (id === request.current) setRounds(next);
    } catch {
      if (id === request.current) setFailed(true);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      request.current++;
    };
  }, [reload]);
  return (
    <DoudizhuDialog title={t.history} closeLabel={t.close} onClose={onClose}>
      {loading ? (
        <p className={s.help} role="status">
          {t.busy}
        </p>
      ) : failed ? (
        <div className={s.feedback} role="alert">
          <span>{t.historyError}</span>
          <button className={s.textButton} onClick={() => void reload()}>
            {t.refresh}
          </button>
        </div>
      ) : !rounds.length ? (
        <p className={s.help}>{t.noHistory}</p>
      ) : (
        <ol className={s.historyList}>
          {rounds.map((round) => (
            <li
              className={s.historyItem}
              key={`${round.roomId ?? round.finishedAt}:${round.gameNo}`}
            >
              <details>
                <summary>
                  <span>
                    #{round.gameNo} ·{" "}
                    {round.result.winnerSide === "landlord"
                      ? t.landlordWin
                      : t.farmersWin}
                  </span>
                  <time className={s.help} dateTime={round.finishedAt}>
                    {new Date(round.finishedAt).toLocaleString(locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </summary>
                <div className={s.historyScores}>
                  {round.players.map((player) => {
                    const delta =
                      round.result.scores.find(
                        (score) => score.seat === player.seat,
                      )?.delta ?? 0;
                    return (
                      <div key={player.seat}>
                        <span>{player.name}</span>
                        <b>
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </b>
                      </div>
                    );
                  })}
                </div>
                <div className={s.scoreDetails}>
                  <span>
                    {t.base} <b>{round.result.baseScore}</b>
                  </span>
                  <span>
                    {t.multiplier} <b>×{round.result.multiplier}</b>
                  </span>
                  <span>
                    {t.bombs} <b>{round.result.bombCount}</b>
                  </span>
                  {round.result.spring && (
                    <span>
                      {round.result.spring === "spring"
                        ? t.spring
                        : t.antiSpring}
                    </span>
                  )}
                  {round.result.capped && <span>{t.capped}</span>}
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </DoudizhuDialog>
  );
}
