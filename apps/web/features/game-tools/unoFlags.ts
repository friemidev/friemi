type UnoEnvironment = { NODE_ENV?: string; VERCEL_ENV?: string };

/** Vercel preview builds use NODE_ENV=production but remain playable for testing. */
export function isUnoEnabled(env: UnoEnvironment = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") return true;
  return env.NODE_ENV !== "production";
}
