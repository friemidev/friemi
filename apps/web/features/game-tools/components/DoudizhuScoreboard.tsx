"use client";
import { Fragment } from "react";
import type { DdzMatchView } from "../doudizhuTypes";
import {
  doudizhuRankLabel,
  doudizhuRoundLabel,
  getDoudizhuCopy,
} from "../doudizhuCopy";
import { DoudizhuDialog } from "./DoudizhuChrome";
import s from "./DoudizhuScoreboard.module.css";

const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;

export function DoudizhuScoreboard({
  match,
  locale,
  viewerSeat,
  onClose,
}: {
  match: DdzMatchView;
  locale: string;
  viewerSeat: number;
  onClose: () => void;
}) {
  const t = getDoudizhuCopy(locale);
  const players = [...match.players].sort(
    (a, b) => a.rank - b.rank || a.seat - b.seat,
  );
  const seats = [...match.players].sort((a, b) => a.seat - b.seat);
  const last = match.rounds.at(-1);
  return (
    <DoudizhuDialog
      title={match.status === "COMPLETE" ? t.matchResults : t.scoreboard}
      closeLabel={t.close}
      onClose={onClose}
    >
      <div className={s.scoreboard} data-ddz-scoreboard>
        <p className={s.progress}>
          <span>{t.completedRounds}</span>
          <strong>
            {match.rounds.length} / {match.roundCount}
          </strong>
          {match.status === "COMPLETE" && (
            <span className={s.complete}>{t.matchComplete}</span>
          )}
        </p>
        <table className={s.standings}>
          <caption className={s.srOnly}>{t.matchResults}</caption>
          <thead>
            <tr>
              <th scope="col">{t.ranking}</th>
              <th scope="col">{t.player}</th>
              <th scope="col">{t.totalScore}</th>
              <th scope="col">{t.lastRound}</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const tied = players.some(
                (other) =>
                  other.seat !== player.seat && other.rank === player.rank,
              );
              const rank = doudizhuRankLabel(player.rank, tied, locale);
              const delta = last?.result.scores.find(
                (score) => score.seat === player.seat,
              )?.delta;
              return (
                <tr
                  key={player.seat}
                  data-self={player.seat === viewerSeat || undefined}
                >
                  <td>
                    <span className={s.rank} aria-label={rank} title={rank}>
                      {tied ? "=" : ""}
                      {player.rank}
                    </span>
                  </td>
                  <th scope="row">
                    <span className={s.playerName}>{player.name}</span>
                    {player.seat === viewerSeat && (
                      <span className={s.you}>{t.you}</span>
                    )}
                    <span className={s.wins}>
                      {t.wins}{" "}
                      {
                        match.rounds.filter(
                          (round) =>
                            (round.result.scores.find(
                              (score) => score.seat === player.seat,
                            )?.delta ?? 0) > 0,
                        ).length
                      }
                    </span>
                  </th>
                  <td
                    className={s.total}
                    data-positive={player.totalScore > 0 || undefined}
                  >
                    {signed(player.totalScore)}
                  </td>
                  <td className={s.last}>
                    {delta === undefined ? "—" : signed(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!match.rounds.length ? (
          <p className={s.empty}>{t.noMatchRounds}</p>
        ) : (
          <details className={s.details}>
            <summary tabIndex={0}>
              {t.roundDetails}
              <span>{match.rounds.length}</span>
            </summary>
            <div
              className={s.roundsScroll}
              tabIndex={0}
              role="region"
              aria-label={t.roundDetails}
            >
              <table className={s.rounds}>
                <caption className={s.srOnly}>{t.roundDetails}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.roundDetails}</th>
                    {seats.map((player) => (
                      <th key={player.seat} scope="col">
                        <span title={player.name}>{player.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {match.rounds.map((round) => (
                    <Fragment key={round.gameNo}>
                      <tr>
                        <th scope="row">
                          {doudizhuRoundLabel(
                            round.roundIndex,
                            match.roundCount,
                            locale,
                          )}
                        </th>
                        {seats.map((player) => {
                          const delta =
                            round.result.scores.find(
                              (score) => score.seat === player.seat,
                            )?.delta ?? 0;
                          return (
                            <td
                              key={player.seat}
                              data-positive={delta > 0 || undefined}
                            >
                              {signed(delta)}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className={s.roundMeta}>
                        <td colSpan={seats.length + 1}>
                          {t.base} {round.result.baseScore} · {t.multiplier} ×
                          {round.result.multiplier} · {t.bombs}{" "}
                          {round.result.bombCount}
                          {round.result.spring
                            ? ` · ${round.result.spring === "spring" ? t.spring : t.antiSpring}`
                            : ""}
                          {round.result.capped ? ` · ${t.capped}` : ""}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </DoudizhuDialog>
  );
}
