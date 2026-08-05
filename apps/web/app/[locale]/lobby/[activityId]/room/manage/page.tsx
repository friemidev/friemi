import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityRoomManagePage } from "@/features/activity-room-chat/components/ActivityRoomChatPage";
import {
  getActivityRoomChatPageData,
  getActivityRoomManagementData,
} from "@/features/activity-room-chat/services/activityRoomChat";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getSignInHref } from "@/lib/auth-redirect";

type ActivityRoomManageRouteProps = {
  params: Promise<{
    activityId: string;
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
const guestPolicy = {
  canSend: false,
  canView: false,
  reason: "NOT_ROOM_MEMBER",
  role: "NONE",
} as const;

export default async function ActivityRoomManageRoute({
  params,
}: ActivityRoomManageRouteProps) {
  const { activityId, locale } = await params;
  const redirectPath = `/lobby/${activityId}/room/manage`;
  const viewerProfile = await getOptionalCurrentUserProfileSnapshot();
  const roomData = viewerProfile
    ? await getActivityRoomChatPageData({
        activityId,
        limit: 1,
        viewerProfileId: viewerProfile.id,
      }).catch((error: unknown) => {
        console.error("Failed to load activity room info", error);

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
  const management =
    viewerProfile && roomData.policy.canView
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
      <ActivityRoomManagePage
        activity={roomData.activity}
        activityId={activityId}
        locale={locale}
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
