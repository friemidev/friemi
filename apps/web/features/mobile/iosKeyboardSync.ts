type IOSKeyboardSyncFiles = {
  config: unknown;
  installedPodfileLock: string | null;
  podfileLock: string | null;
};

export function getIOSKeyboardSyncIssues({
  config,
  installedPodfileLock,
  podfileLock,
}: IOSKeyboardSyncFiles) {
  const issues: string[] = [];
  if (
    !podfileLock ||
    !/^  - CapacitorKeyboard \(7\.0\.6\):$/m.test(podfileLock)
  ) {
    issues.push("Podfile.lock does not contain CapacitorKeyboard 7.0.6.");
  }
  if (!installedPodfileLock || installedPodfileLock !== podfileLock) {
    issues.push("Installed CocoaPods do not match Podfile.lock.");
  }
  const classes =
    config && typeof config === "object" && "packageClassList" in config
      ? config.packageClassList
      : undefined;
  if (!Array.isArray(classes) || !classes.includes("KeyboardPlugin")) {
    issues.push(
      "Synced capacitor.config.json does not register KeyboardPlugin.",
    );
  }
  return issues;
}
