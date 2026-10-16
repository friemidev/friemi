import { appleAppSiteAssociation } from "@/features/mobile/appAssociations";
import { APP_HANDOFF_ENABLED } from "@/features/mobile/appHandoffRollout";

export function GET() {
  return Response.json(
    APP_HANDOFF_ENABLED
      ? appleAppSiteAssociation
      : { applinks: { apps: [], details: [] } },
    {
      headers: {
        "Cache-Control": APP_HANDOFF_ENABLED ? "public, max-age=3600" : "no-store",
      },
    },
  );
}
