export function isWerewolfTestBotFeatureEnabled() {
  const isNonProductionRuntime =
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "development" ||
    process.env.VERCEL_ENV === "preview";
  const explicitValue =
    process.env.ENABLE_WEREWOLF_TEST_BOTS ??
    process.env.NEXT_PUBLIC_ENABLE_WEREWOLF_TEST_BOTS;
  const normalizedValue = explicitValue?.trim().toLowerCase();

  if (
    normalizedValue === "1" ||
    normalizedValue === "true" ||
    normalizedValue === "yes"
  ) {
    return isNonProductionRuntime;
  }

  if (
    normalizedValue === "0" ||
    normalizedValue === "false" ||
    normalizedValue === "no"
  ) {
    return false;
  }

  return isNonProductionRuntime;
}
