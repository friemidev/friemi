import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { generateActivityDetailMetadata } from "@/features/activities/pages/ActivityDetailPageContent";
import {
  getActivityById,
  getActivityShareMetadataById,
} from "@/features/activities/queries/getActivityById";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { ensurePublicEventFromActivityInfo } from "@/features/public-events/queries/ensurePublicEventFromActivityInfo";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";

type ActivityDetailPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
  searchParams: Promise<{
    access?: string;
    claimed?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: ActivityDetailPageProps,
): Promise<Metadata> {
  return generateActivityDetailMetadata(props, "legacy");
}

export default async function ActivityDetailLegacyRedirectPage({
  params,
  searchParams,
}: ActivityDetailPageProps) {
  const { locale, activityId } = await params;
  const { access: accessToken } = await searchParams;
  const activity = await getActivityShareMetadataById(
    activityId,
    accessToken ?? null,
  );
  let publicEventId = activity?.publicEventId ?? null;

  if (!activity) {
    const viewerProfile = await getOptionalCurrentUserProfileSnapshot();
    const viewerFriendIds = viewerProfile?.id
      ? await getViewerFriendIds(viewerProfile.id)
      : [];
    const viewerActivity = await getActivityById(
      activityId,
      viewerProfile?.id ?? null,
      viewerFriendIds,
      accessToken ?? null,
    );

    if (!viewerActivity) {
      notFound();
    }

    publicEventId = viewerActivity.publicEventId ?? null;
  }

  if (publicEventId) {
    redirect(withLocale(locale, `/public-events/${publicEventId}`));
  }

  const ensuredPublicEventId =
    await ensurePublicEventFromActivityInfo(activityId);

  if (ensuredPublicEventId) {
    redirect(withLocale(locale, `/public-events/${ensuredPublicEventId}`));
  }

  const nextSearchParams = new URLSearchParams();

  if (accessToken) {
    nextSearchParams.set("access", accessToken);
  }

  const nextQuery = nextSearchParams.toString();

  redirect(
    withLocale(
      locale,
      `${getActivityDetailPath(activityId)}${nextQuery ? `?${nextQuery}` : ""}`,
    ),
  );
}
