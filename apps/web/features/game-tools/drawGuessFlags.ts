import "server-only";

export function isDrawGuessClassicEnabled() {
  return process.env.DRAW_GUESS_CLASSIC_ENABLED === "true";
}
