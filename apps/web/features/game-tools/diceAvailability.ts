type DiceEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
};

/** Preview deployments also use NODE_ENV=production. The deployment tier wins. */
export function isDicePreviewEnabled(environment: DiceEnvironment = process.env) {
  if (environment.VERCEL_ENV !== undefined) {
    return environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "development";
  }

  return environment.NODE_ENV === "development";
}
