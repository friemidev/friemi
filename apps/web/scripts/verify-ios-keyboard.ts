import { readFile } from "node:fs/promises";
import { getIOSKeyboardSyncIssues } from "../features/mobile/iosKeyboardSync";

const ios = new URL("../../ios/App/", import.meta.url);
async function readOptional(name: string) {
  try {
    return await readFile(new URL(name, ios), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

const configText = await readOptional("App/capacitor.config.json");
const issues = getIOSKeyboardSyncIssues({
  config: configText ? JSON.parse(configText) : null,
  installedPodfileLock: await readOptional("Pods/Manifest.lock"),
  podfileLock: await readOptional("Podfile.lock"),
});

if (issues.length) {
  console.error(issues.join("\n"));
  console.error(
    "On macOS, run npm run ios:sync --workspace=apps/web before archiving the iOS app.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "iOS Keyboard plugin is installed and registered. Verify the accessory bar on a real iPhone before release.",
  );
}
