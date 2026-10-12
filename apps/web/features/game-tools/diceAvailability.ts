type DiceEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

/** Dice is released in development, preview and production. The deployment tier wins. */
export function isDiceEnabled(environment: DiceEnvironment = process.env) {
  if (environment.VERCEL_ENV !== undefined) {
    return ["production", "preview", "development"].includes(environment.VERCEL_ENV);
  }

  return environment.NODE_ENV === "development" || environment.NODE_ENV === "production";
}

export function isDiceProduction(environment: DiceEnvironment = process.env) {
  return environment.VERCEL_ENV !== undefined
    ? environment.VERCEL_ENV === "production"
    : environment.NODE_ENV === "production";
}
