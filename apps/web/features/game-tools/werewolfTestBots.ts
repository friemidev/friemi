export function resolveWerewolfTestBotFeatureEnabled({
  explicitValue,
  nodeEnvironment,
  vercelEnvironment,
}: {
  explicitValue?: string;
  nodeEnvironment?: string;
  vercelEnvironment?: string;
}) {
  const isNonProductionRuntime =
    nodeEnvironment !== "production" ||
    vercelEnvironment === "development" ||
    vercelEnvironment === "preview";
  const normalizedValue = explicitValue?.trim().toLowerCase();

  if (
    normalizedValue === "1" ||
    normalizedValue === "true" ||
    normalizedValue === "yes" ||
    normalizedValue === "on"
  ) {
    return isNonProductionRuntime;
  }

  if (
    normalizedValue === "0" ||
    normalizedValue === "false" ||
    normalizedValue === "no" ||
    normalizedValue === "off"
  ) {
    return false;
  }

  return isNonProductionRuntime;
}

export function isWerewolfTestBotFeatureEnabled() {
  return resolveWerewolfTestBotFeatureEnabled({
    explicitValue:
      process.env.ENABLE_WEREWOLF_TEST_BOTS ??
      process.env.NEXT_PUBLIC_ENABLE_WEREWOLF_TEST_BOTS,
    nodeEnvironment: process.env.NODE_ENV,
    vercelEnvironment: process.env.VERCEL_ENV,
  });
}
