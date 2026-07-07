export function isWerewolfTestBotFeatureEnabled() {
  const explicitValue =
    process.env.ENABLE_WEREWOLF_TEST_BOTS ??
    process.env.NEXT_PUBLIC_ENABLE_WEREWOLF_TEST_BOTS;
  const normalizedValue = explicitValue?.trim().toLowerCase();

  if (
    normalizedValue === "1" ||
    normalizedValue === "true" ||
    normalizedValue === "yes"
  ) {
    return true;
  }

  if (
    normalizedValue === "0" ||
    normalizedValue === "false" ||
    normalizedValue === "no"
  ) {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}
