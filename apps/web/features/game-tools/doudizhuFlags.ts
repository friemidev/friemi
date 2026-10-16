type DoudizhuEnvironment = { NODE_ENV?: string; VERCEL_ENV?: string; DOUDIZHU_ENABLED?: string };

/** Keep a new server game off until its migration and deadline worker are installed. */
export function isDoudizhuEnabled(env: DoudizhuEnvironment = process.env): boolean {
  if (env.DOUDIZHU_ENABLED !== undefined) return env.DOUDIZHU_ENABLED === "true";
  return env.NODE_ENV === "development" && !env.VERCEL_ENV;
}
