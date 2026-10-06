import "server-only";

function isDrawGuessModeEnabled(name: string) {
  const configured = process.env[name];

  if (configured !== undefined) {
    return configured === "true";
  }

  return process.env.VERCEL_ENV === "production";
}

export function isDrawGuessClassicEnabled() {
  return isDrawGuessModeEnabled("DRAW_GUESS_CLASSIC_ENABLED");
}

export function isDrawGuessChainEnabled() {
  // Relay is available in every environment; an explicit false remains a kill switch.
  return process.env.DRAW_GUESS_CHAIN_ENABLED !== "false";
}

export function isDrawGuessPreviewDuoEnabled() {
  return process.env.VERCEL_ENV === "preview" && isDrawGuessClassicEnabled();
}

export function isDrawGuessPreviewRelayDuoEnabled() {
  return process.env.VERCEL_ENV === "preview" && isDrawGuessChainEnabled();
}
