import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityRoomChatPage } from "@/features/activity-room-chat/components/ActivityRoomChatPage";
import {
  getActivityRoomChatPageData,
  getActivityRoomManagementData,
  getUnreadActivityRoomTotalMessageCount,
  markActivityRoomChatRead,
} from "@/features/activity-room-chat/services/activityRoomChat";
import { DirectMessageUnreadCountHydrator } from "@/features/direct-messages/components/DirectMessageUnreadCountHydrator";
import { getUnreadDirectMessageCount } from "@/features/direct-messages/queries/getDirectMessages";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getSignInHref } from "@/lib/auth-redirect";

type ActivityRoomPageProps = {
  params: Promise<{
    activityId: string;
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

const guestPolicy = {
  canSend: false,
  canView: false,
  reason: "NOT_ROOM_MEMBER",
  role: "NONE",
} as const;

export default async function ActivityRoomPage({
  params,
}: ActivityRoomPageProps) {
  const { activityId, locale } = await params;
  const redirectPath = `/lobby/${activityId}/room`;
  const viewerProfile = await getOptionalCurrentUserProfileSnapshot();
  const roomData = viewerProfile
    ? await getActivityRoomChatPageData({
        activityId,
        viewerProfileId: viewerProfile.id,
      }).catch((error: unknown) => {
        console.error("Failed to load activity room chat", error);

        return {
          activity: null,
          messages: [],
          policy: {
            canSend: false,
            canView: false,
            reason: "ACTIVITY_NOT_FOUND",
            role: "NONE",
          } as const,
        };
      })
    : {
        activity: null,
        messages: [],
        policy: guestPolicy,
      };

  let unreadMessageCount: number | null = null;

  if (viewerProfile && roomData.policy.canView) {
    await markActivityRoomChatRead({
      activityId,
      profileId: viewerProfile.id,
    }).catch((error: unknown) => {
      console.error("Failed to mark activity room chat read", error);
    });

    unreadMessageCount = await Promise.all([
      getUnreadDirectMessageCount(viewerProfile.id),
      getUnreadActivityRoomTotalMessageCount(viewerProfile.id),
    ])
      .then(([directCount, roomCount]) => directCount + roomCount)
      .catch((error: unknown) => {
        console.error("Failed to load unread chat count after room read", error);

        return null;
      });
  }

  const management = viewerProfile
    ? await getActivityRoomManagementData({
        activityId,
        viewerProfileId: viewerProfile.id,
      }).catch((error: unknown) => {
        console.error("Failed to load activity room management", error);

        return null;
      })
    : null;

  return (
    <PageContainer className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:max-w-none max-md:overflow-hidden max-md:px-0 max-md:pb-0 max-md:pt-0 md:py-8">
      {unreadMessageCount === null ? null : (
        <DirectMessageUnreadCountHydrator unreadCount={unreadMessageCount} />
      )}
      <ActivityRoomChatPage
        activity={roomData.activity}
        activityId={activityId}
        locale={locale}
        messages={roomData.messages}
        management={management}
        policy={roomData.policy}
        signInHref={getSignInHref(locale, redirectPath)}
        viewer={
          viewerProfile
            ? {
                avatarUrl: viewerProfile.avatarUrl,
                id: viewerProfile.id,
                nickname: viewerProfile.nickname,
              }
            : null
        }
      />
    </PageContainer>
  );
}
