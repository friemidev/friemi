import { NextResponse } from "next/server";
import { getActivityRoomChatRoster } from "@/features/activity-room-chat/services/activityRoomChat";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import { getOfficialMessageRoster } from "@/features/official-messages/services/officialMessages";
import { getPlanetChatRoster } from "@/features/planets/services/planetChat";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getSupportedLocale(value: string | null) {
  return value === "en" || value === "fr" || value === "zh-CN"
    ? value
    : "zh-CN";
}

export async function GET(request: Request) {
  try {
    const viewerProfileId = await getOptionalAuthenticatedProfileId();

    if (!viewerProfileId) {
      return NextResponse.json(
        { error: "Authentication required.", ok: false },
        { status: 401 },
      );
    }

    const locale = getSupportedLocale(new URL(request.url).searchParams.get("locale"));
    const [friendsResult, officialResult, activityRoomsResult, planetsResult] =
      await Promise.all([
        getDirectMessageFriendRoster(viewerProfileId)
          .then((friends) => ({ data: friends, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to refresh direct message roster", error);
            return { data: [], error };
          }),
        getOfficialMessageRoster(viewerProfileId, locale)
          .then((officialMessages) => ({ data: officialMessages, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to refresh official message roster", error);
            return { data: null, error };
          }),
        getActivityRoomChatRoster(viewerProfileId)
          .then((activityRoomChats) => ({
            data: activityRoomChats,
            error: null,
          }))
          .catch((error: unknown) => {
            console.error("Failed to refresh activity room roster", error);
            return { data: [], error };
          }),
        getPlanetChatRoster(viewerProfileId, locale)
          .then((planetChats) => ({ data: planetChats, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to refresh planet chat roster", error);
            return { data: [], error };
          }),
      ]);

    return NextResponse.json(
      {
        activityRoomChats: activityRoomsResult.data,
        friends: friendsResult.data,
        hasError: Boolean(
          friendsResult.error ||
            officialResult.error ||
            activityRoomsResult.error ||
            planetsResult.error,
        ),
        officialMessages: officialResult.data,
        ok: true,
        planetChats: planetsResult.data,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Failed to refresh footprints message roster", error);

    return NextResponse.json(
      { error: "Failed to load messages.", ok: false },
      { status: 500 },
    );
  }
}
