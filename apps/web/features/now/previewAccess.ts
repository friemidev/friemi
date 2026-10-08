// The sample NOW journey is public only on its own Vercel Preview branch.
export function isNowPreviewEnabled(
  env: Partial<
    Record<"NODE_ENV" | "VERCEL_ENV" | "VERCEL_GIT_COMMIT_REF", string>
  > = process.env,
) {
  return (
    env.NODE_ENV === "development" ||
    (env.VERCEL_ENV === "preview" &&
      env.VERCEL_GIT_COMMIT_REF === "codex/home-v2")
  );
}
