import "server-only";

export function isDrawGuessClassicEnabled() {
  return process.env.DRAW_GUESS_CLASSIC_ENABLED === "true";
}

export function isDrawGuessChainEnabled() {
  return process.env.DRAW_GUESS_CHAIN_ENABLED === "true";
}

export function isDrawGuessPreviewDuoEnabled() {
  return process.env.VERCEL_ENV === "preview" && isDrawGuessClassicEnabled();
}
