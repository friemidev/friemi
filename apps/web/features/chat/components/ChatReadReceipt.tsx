import {
  getUnreadActivityRoomTotalMessageCount,
  markActivityRoomChatRead,
} from "@/features/activity-room-chat/services/activityRoomChat";
import { DirectMessageUnreadCountHydrator } from "@/features/direct-messages/components/DirectMessageUnreadCountHydrator";
import {
  getUnreadDirectMessageCount,
  markDirectConversationRead,
} from "@/features/direct-messages/queries/getDirectMessages";
import { markPlanetChatRead } from "@/features/planets/services/planetChat";

type ChatReadReceiptProps = {
  profileId: string;
  subjectId: string;
} & (
  | { scope: "direct"; peerProfileId: string }
  | { scope: "activity" | "planet" }
);

// Render only after the page has authorized the viewer, inside Suspense.
// Read receipts and badge queries must not delay the conversation's first paint.
export async function ChatReadReceipt(props: ChatReadReceiptProps) {
  try {
    if (props.scope === "planet") {
      await markPlanetChatRead({
        planetId: props.subjectId,
        profileId: props.profileId,
      });
      return null;
    }

    if (props.scope === "direct") {
      await markDirectConversationRead({
        conversationId: props.subjectId,
        currentUserProfileId: props.profileId,
        peerProfileId: props.peerProfileId,
      });
    } else {
      await markActivityRoomChatRead({
        activityId: props.subjectId,
        profileId: props.profileId,
      });
    }

    const [directCount, roomCount] = await Promise.all([
      getUnreadDirectMessageCount(props.profileId),
      getUnreadActivityRoomTotalMessageCount(props.profileId),
    ]);
    return (
      <DirectMessageUnreadCountHydrator unreadCount={directCount + roomCount} />
    );
  } catch (error) {
    console.error("Failed to update chat read receipt", error);
    return null;
  }
}
