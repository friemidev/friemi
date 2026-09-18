import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { PollDetailView } from "@/features/polls/components/PollDetailView";
import { getInternalActivityPollView } from "@/features/polls/server/pollService";
import { ensureCurrentUserProfileSnapshot } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; activityId: string; pollId: string }>;
};

export default async function ActivityPollDetailPage({ params }: PageProps) {
  const { activityId, locale, pollId } = await params;
  const profile = await ensureCurrentUserProfileSnapshot(
    locale,
    `/lobby/${activityId}/polls/${pollId}`,
  );
  const poll = await getInternalActivityPollView({
    pollId,
    profileId: profile.id,
  });

  if (!poll || poll.activity.id !== activityId) notFound();

  return (
    <PageContainer
      className="max-w-[640px] bg-[#FEFFF9] pb-24 pt-4 sm:py-8"
      mobileSafeBottom
      mobileSafeTop
    >
      <MobileNavSectionOverride section="activities" />
      <PollDetailView
        locale={locale}
        poll={poll}
        returnHref={withLocale(locale, `/lobby/${activityId}/polls`)}
      />
    </PageContainer>
  );
}
