import { appleAppSiteAssociation } from "@/features/mobile/appAssociations";

export function GET() {
  return Response.json(appleAppSiteAssociation, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
