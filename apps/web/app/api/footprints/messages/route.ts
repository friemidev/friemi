import { NextResponse } from "next/server";
import { getActivityRoomChatRoster } from "@/features/activity-room-chat/services/activityRoomChat";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import {
  getOfficialFeedbackRoster,
  getOfficialMessageRoster,
} from "@/features/official-messages/services/officialMessages";
import { getPlanetChatRoster } from "@/features/planets/services/planetChat";
import {
  isChatRealtimeScope,
  type ChatRealtimeScope,
} from "@/features/chat/chatRealtime";
import { getOptionalAuthenticatedProfileId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getSupportedLocale(value: string | null) {
  return value === "en" || value === "fr" || value === "zh-CN"
    ? value
    : "zh-CN";
}

function getRequestedScope(value: string | null): ChatRealtimeScope | null {
  return isChatRealtimeScope(value) ? value : null;
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

    const searchParams = new URL(request.url).searchParams;
    const locale = getSupportedLocale(searchParams.get("locale"));
    const requestedScope = getRequestedScope(searchParams.get("scope"));
    const shouldLoad = (scope: ChatRealtimeScope) =>
      requestedScope === null || requestedScope === scope;
    const [
      friendsResult,
      officialResult,
      officialFeedbackResult,
      activityRoomsResult,
      planetsResult,
    ] = await Promise.all([
      shouldLoad("direct")
        ? getDirectMessageFriendRoster(viewerProfileId)
            .then((friends) => ({ data: friends, error: null }))
            .catch((error: unknown) => {
              console.error("Failed to refresh direct message roster", error);
              return { data: [], error };
            })
        : Promise.resolve({ data: undefined, error: null }),
      shouldLoad("official")
        ? getOfficialMessageRoster(viewerProfileId, locale)
            .then((officialMessages) => ({
              data: officialMessages,
              error: null,
            }))
            .catch((error: unknown) => {
              console.error("Failed to refresh official message roster", error);
              return { data: null, error };
            })
        : Promise.resolve({ data: undefined, error: null }),
      shouldLoad("official")
        ? getOfficialFeedbackRoster(viewerProfileId, locale)
            .then((officialFeedbackInbox) => ({
              data: officialFeedbackInbox,
              error: null,
            }))
            .catch((error: unknown) => {
              console.error(
                "Failed to refresh official feedback roster",
                error,
              );
              return { data: null, error };
            })
        : Promise.resolve({ data: undefined, error: null }),
      shouldLoad("activity")
        ? getActivityRoomChatRoster(viewerProfileId)
            .then((activityRoomChats) => ({
              data: activityRoomChats,
              error: null,
            }))
            .catch((error: unknown) => {
              console.error("Failed to refresh activity room roster", error);
              return { data: [], error };
            })
        : Promise.resolve({ data: undefined, error: null }),
      shouldLoad("planet")
        ? getPlanetChatRoster(viewerProfileId, locale)
            .then((planetChats) => ({ data: planetChats, error: null }))
            .catch((error: unknown) => {
              console.error("Failed to refresh planet chat roster", error);
              return { data: [], error };
            })
        : Promise.resolve({ data: undefined, error: null }),
    ]);

    return NextResponse.json(
      {
        activityRoomChats: activityRoomsResult.data,
        friends: friendsResult.data,
        hasError: Boolean(
          friendsResult.error ||
          officialResult.error ||
          officialFeedbackResult.error ||
          activityRoomsResult.error ||
          planetsResult.error,
        ),
        officialMessages: officialResult.data,
        officialFeedbackInbox: officialFeedbackResult.data,
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
