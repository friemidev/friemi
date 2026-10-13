import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getActivityRoomChatPageData,
  getActivityRoomManagementData,
} from "@/features/activity-room-chat/services/activityRoomChat";
import { canUseLocalGroupAssistantPreview } from "./guard";
import { GroupAssistantPreview } from "./preview";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  if (!canUseLocalGroupAssistantPreview()) notFound();
  const { locale } = await params;
  const query = await searchParams;
  const role = ["host", "admin", "member"].includes(query.role ?? "")
    ? query.role!
    : "host";
  const viewer = await prisma.userProfile.findUnique({
    where: { id: `welcome-preview-${role}` },
    select: { id: true, nickname: true, avatarUrl: true },
  });
  if (!viewer) notFound();
  const activityId = "welcome-preview-group";
  const data = await getActivityRoomChatPageData({
    activityId,
    viewerProfileId: viewer.id,
  });
  const management = await getActivityRoomManagementData({
    activityId,
    viewerProfileId: viewer.id,
  });
  return (
    <GroupAssistantPreview
      role={role}
      data={{
        ...data,
        activityId,
        locale,
        viewer,
        management,
        signInHref: `/${locale}/sign-in`,
      }}
    />
  );
}
