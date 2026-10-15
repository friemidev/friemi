import { androidAssetLinks } from "@/features/mobile/appAssociations";

export function GET() {
  return Response.json(androidAssetLinks, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
