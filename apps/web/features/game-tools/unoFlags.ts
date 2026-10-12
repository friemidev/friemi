type UnoEnvironment = { NODE_ENV?: string; VERCEL_ENV?: string };

/** UNO early access is playable on every deployment tier and on self-hosted builds. */
export function isUnoEnabled(env: UnoEnvironment = process.env): boolean {
  if (env.VERCEL_ENV) return ["production", "preview", "development"].includes(env.VERCEL_ENV);
  return true;
}
