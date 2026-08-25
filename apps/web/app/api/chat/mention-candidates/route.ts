import { NextResponse } from "next/server";
import { z } from "zod";
import { getActivityRoomMentionCandidates } from "@/features/activity-room-chat/services/activityRoomChat";
import { getPlanetMentionCandidates } from "@/features/planets/services/planetChat";
import { withApiRequestMetrics } from "@/lib/apiRequestMetrics";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import {
  checkDistributedRateLimit,
  getRateLimitResponseHeaders,
} from "@/lib/distributedRateLimit";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().max(80).default(""),
  roomId: z.string().trim().min(1).max(80),
  scopeKind: z.enum(["activity", "planet"]),
});

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
};

export async function GET(request: Request) {
  return withApiRequestMetrics(
    request,
    "/api/chat/mention-candidates",
    async ({ requestId }) => {
      const url = new URL(request.url);
      const result = querySchema.safeParse({
        q: url.searchParams.get("q") ?? "",
        roomId: url.searchParams.get("roomId") ?? "",
        scopeKind: url.searchParams.get("scopeKind") ?? "",
      });

      if (!result.success) {
        return NextResponse.json(
          { error: "INVALID_REQUEST", requestId },
          { headers: noStoreHeaders, status: 400 },
        );
      }

      const viewer = await getOptionalCurrentUserProfileSnapshot();

      if (!viewer) {
        return NextResponse.json(
          { error: "UNAUTHORIZED", requestId },
          { headers: noStoreHeaders, status: 401 },
        );
      }

      const rateLimit = await checkDistributedRateLimit({
        identifier: viewer.id,
        limit: 60,
        scope: "mention-candidates",
        window: "1 m",
      });

      if (!rateLimit.allowed) {
        return NextResponse.json(
          { error: "RATE_LIMITED", requestId },
          {
            headers: getRateLimitResponseHeaders(rateLimit),
            status: 429,
          },
        );
      }

      try {
        const candidates =
          result.data.scopeKind === "activity"
            ? await getActivityRoomMentionCandidates({
                activityId: result.data.roomId,
                query: result.data.q,
                viewerProfileId: viewer.id,
              })
            : await getPlanetMentionCandidates({
                planetId: result.data.roomId,
                query: result.data.q,
                viewerProfileId: viewer.id,
              });

        return NextResponse.json(
          { ...candidates, requestId },
          { headers: noStoreHeaders },
        );
      } catch (error) {
        console.error("Failed to load chat mention candidates", error);

        return NextResponse.json(
          { error: "MENTION_CANDIDATES_UNAVAILABLE", requestId },
          { headers: noStoreHeaders, status: 403 },
        );
      }
    },
  );
}
