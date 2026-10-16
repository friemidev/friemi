type DoudizhuEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  DOUDIZHU_ENABLED?: string;
};

/** Preview is open for testing; production still needs an explicit release flag. */
export function isDoudizhuEnabled(
  env: DoudizhuEnvironment = process.env,
): boolean {
  if (env.DOUDIZHU_ENABLED !== undefined)
    return env.DOUDIZHU_ENABLED === "true";
  if (env.VERCEL_ENV)
    return ["preview", "development"].includes(env.VERCEL_ENV);
  return env.NODE_ENV === "development";
}
