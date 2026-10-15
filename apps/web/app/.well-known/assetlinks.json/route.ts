import { androidAssetLinks } from "@/features/mobile/appAssociations";
import { APP_HANDOFF_ENABLED } from "@/features/mobile/appHandoffRollout";

export function GET() {
  // Old Android packages claim every path; do not activate them during web-only rollout.
  return Response.json(APP_HANDOFF_ENABLED ? androidAssetLinks : [], {
    headers: {
      "Cache-Control": APP_HANDOFF_ENABLED ? "public, max-age=3600" : "no-store",
    },
  });
}
