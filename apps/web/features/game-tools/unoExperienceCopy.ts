import type { UnoEvent, UnoRuleSettings, UnoRulesetVersion } from "./unoTypes";
import { getUnoRules } from "./unoRules";

const en = {
  format: "Game mode", scoreMode: "Points match", scoreHint: "First to 500 points", singleMode: "Single round", singleHint: "One round, one winner",
  examples: "Report examples", example1: "Milo plays from two cards to one without tapping UNO. You can report him now, before the next player plays or draws.",
  example2: "At two players, Skip or Reverse can return the turn to Milo. Report before his next play or draw; once he acts, the window closes.",
  ruling: "Timing & penalties", order: "Calls, reports and plays are settled in the order the server successfully commits them. Your screen's click time does not decide a tie. An accepted final card ends the round immediately.",
  timeouts: ["Time runs out before you draw: draw one and end your turn.", "Time runs out after you draw: keep that card and end your turn, with no extra draw.", "No response to +4 in 15 seconds: accept four and end your turn."],
  modesRule: "A quick round ends with the first player out. A points match continues until someone reaches 500 points.",
  keepAndEnd: "End turn", scrollHand: "Swipe to see all your cards", clockwise: "Clockwise", counterclockwise: "Counterclockwise", judgement: "Penalty details", lastJudgement: "+4 details",
  challengeWon: "The player held the previous colour when playing +4. They draw {count} cards; the challenger keeps their turn.",
  challengeLost: "The player had no card of the previous colour. The challenger draws {count} cards and skips.",
  accepted: "The penalty of {count} cards was accepted. Play passes to the next player.",
  timeoutDrew: "The player timed out, drew {count} cards, and skipped their turn.", timeoutKept: "The turn ended with no extra card drawn.",
  reportCaught: "UNO was missed and reported in time. The player draws two; the current turn continues.",
  reportFalse: "The reported player had already declared UNO. The reporter draws two; the current turn continues.",
  reactionWait: "Please wait before sending again.",
};
const zh: typeof en = {
  format: "游戏模式", scoreMode: "积分赛", scoreHint: "先到 500 分获胜", singleMode: "单局", singleHint: "一轮定胜负",
  examples: "举报示例", example1: "小蓝没点 UNO 就从两张打到一张。此时可以举报；下一位玩家一旦出牌或摸牌，举报机会结束。",
  example2: "双人局出跳过或反转后，可能又轮到小蓝。须在他下一次出牌或摸牌前举报。",
  ruling: "先后顺序与超时", order: "宣告、举报和出牌，按服务器成功提交的先后裁决，不按各自屏幕上的点击时间。合法末张一经接受，本轮立即结束。",
  timeouts: ["还没摸牌就超时：摸一张，结束回合。", "已经摸过牌再超时：保留这张，结束回合，不再多摸。", "+4 在 15 秒内未回应：默认接受摸四张，跳过回合。"],
  modesRule: "单局：第一个出完就结束这场。积分赛：继续下一轮，先到 500 分赢得整场。",
  keepAndEnd: "过牌", scrollHand: "左右滑动，查看全部手牌", clockwise: "顺时针", counterclockwise: "逆时针", judgement: "判罚详情", lastJudgement: "+4 判罚",
  challengeWon: "对方出 +4 时仍有原颜色的牌，罚摸 {count} 张；挑战者继续出牌。",
  challengeLost: "对方出 +4 时没有原颜色的牌，挑战者摸 {count} 张并跳过回合。",
  accepted: "接受罚牌：摸 {count} 张并跳过回合。",
  timeoutDrew: "超时摸 {count} 张，跳过回合。", timeoutKept: "本次超时直接结束回合，没有额外摸牌。",
  reportCaught: "漏喊 UNO 且被及时举报，摸二张。当前回合继续。",
  reportFalse: "被举报者已经宣告过 UNO，因此举报者摸二张。当前回合继续。",
  reactionWait: "发送过快，请稍后重试。",
};
const fr: typeof en = {
  format: "Mode de jeu", scoreMode: "Aux points", scoreHint: "Premier à 500 points", singleMode: "Manche unique", singleHint: "Une manche, un gagnant",
  examples: "Exemples de signalement", example1: "Milo passe de deux cartes à une sans appuyer sur UNO. Signalez-le avant que le joueur suivant joue ou pioche.",
  example2: "À deux, Passer ou Inverser peut redonner le tour à Milo. Signalez-le avant sa prochaine carte ou pioche ; ensuite, le délai est clos.",
  ruling: "Ordre et temps écoulé", order: "Les annonces, signalements et cartes sont arbitrés dans l'ordre de validation du serveur, pas selon l'heure du clic sur chaque écran. La dernière carte acceptée termine immédiatement la manche.",
  timeouts: ["Temps écoulé avant de piocher : piochez une carte et terminez le tour.", "Temps écoulé après la pioche : gardez la carte et terminez, sans piocher à nouveau.", "Sans réponse au +4 sous 15 secondes : acceptez quatre cartes et passez votre tour."],
  modesRule: "Manche unique : le premier sans cartes gagne la partie. Aux points : continuez jusqu'à 500 points.",
  keepAndEnd: "Passer", scrollHand: "Glissez pour voir toutes vos cartes", clockwise: "Sens horaire", counterclockwise: "Sens antihoraire", judgement: "Détail de la pénalité", lastJudgement: "Décision +4",
  challengeWon: "Le joueur avait la couleur précédente en jouant +4. Il pioche {count} cartes ; le contestataire garde son tour.",
  challengeLost: "Le joueur n’avait pas la couleur précédente. Le contestataire pioche {count} cartes et passe son tour.",
  accepted: "La pénalité de {count} cartes est acceptée. Le tour passe au suivant.",
  timeoutDrew: "Le délai a expiré : le joueur pioche {count} cartes et passe son tour.", timeoutKept: "Le tour est terminé sans piocher de carte supplémentaire.",
  reportCaught: "UNO a été oublié et signalé à temps. Le joueur pioche deux ; le tour continue.",
  reportFalse: "Le joueur avait déjà annoncé UNO. Le contestataire pioche deux ; le tour continue.",
  reactionWait: "Veuillez patienter avant de réessayer.",
};
const legacyExamples = {
  "en": {
    "example1": "Milo goes from two cards to one. He has a chance to tap UNO. After the next normal play, draw or turn timeout completes, you may report him if he is still on one card and has not called UNO.",
    "example2": "In a two-player game, Skip or Reverse can give the same player another turn. If their next move is a legal final number card, they win immediately. There may be no opportunity to report them."
  },
  "zh": {
    "example1": "小蓝从两张变成一张，先给他自己点 UNO 的机会。下一次正常出牌、摸牌或普通回合超时完成后，若他仍是一张且没喊，其他人才可举报。",
    "example2": "双人局打出跳过或反转，可能马上又轮到自己。若接着合法打出最后一张数字牌，就立即获胜；这种情况可能没有举报机会。"
  },
  "fr": {
    "example1": "Milo passe de deux cartes à une. Il peut appuyer sur UNO. Après la prochaine carte jouée, pioche ou expiration normale de tour, vous pouvez le signaler s'il a encore une carte sans avoir annoncé UNO.",
    "example2": "À deux, Passer ou Inverser peut redonner le tour au même joueur. S'il joue ensuite légalement son dernier chiffre, il gagne aussitôt. Il peut n'y avoir aucune occasion de le signaler."
  }
} as const;

export function getUnoExperienceCopy(locale: string, rulesetVersion: UnoRulesetVersion = 3, settings: Partial<UnoRuleSettings> = {}) {
  const key = locale === "zh-CN" ? "zh" : locale === "fr" ? "fr" : "en";
  const copy = key === "zh" ? zh : key === "fr" ? fr : en;
  if (rulesetVersion === 1) return { ...copy, ...legacyExamples[key] };
  if (rulesetVersion === 2) return copy;
  const rules = getUnoRules({ ...settings, rulesetVersion });
  const penaltyTimeout = key === "zh" ? "有累计罚牌时超时：摸完累计张数，跳过回合。" : key === "fr" ? "Une pénalité en attente au délai : piochez le total et passez." : "Time runs out with a pending penalty: draw the total and skip.";
  return { ...copy, timeouts: [...copy.timeouts.slice(0, 2), ...(rules.stackDraws ? [penaltyTimeout] : []), ...(rules.challengeDrawFour ? [key === "zh" ? "+4 挑战阶段 15 秒未回应：摸完罚牌，跳过回合。" : key === "fr" ? "Sans réponse au +4 sous 15 secondes : piochez la pénalité et passez." : "No response to +4 in 15 seconds: take the penalty and skip."] : [])] };
}

export function unoVerdictExplanation(event: UnoEvent, locale: string): string | null {
  const t = getUnoExperienceCopy(locale);
  const count = String(event.count ?? (event.kind === "CHALLENGE_LOST" ? 6 : event.kind === "TIMEOUT" ? 1 : 4));
  switch (event.kind) {
    case "CHALLENGE_WON": return t.challengeWon.replace("{count}", count);
    case "CHALLENGE_LOST": return t.challengeLost.replace("{count}", count);
    case "ACCEPT_DRAW_FOUR": return t.accepted.replace("{count}", count);
    case "TIMEOUT": return event.count ? t.timeoutDrew.replace("{count}", count) : t.timeoutKept;
    case "CAUGHT": return t.reportCaught;
    case "FALSE_CATCH": return t.reportFalse;
    default: return null;
  }
}
