import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileVisitorsPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import {
  getProfileVisitSummary,
  getRecentProfileVisitors,
} from "@/features/profile-visits/queries/getProfileVisitors";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileVisitorsPageProps = {
  params: Promise<{
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

const emptyVisitSummary = {
  todayViewCount: 0,
  totalViewCount: 0,
  uniqueVisitorCount: 0,
};

export default async function ProfileVisitorsPage({
  params,
}: ProfileVisitorsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/visitors");
  const result = await Promise.all([
    getProfileVisitSummary(profile.id),
    getRecentProfileVisitors(profile.id),
  ])
    .then(([summary, visitors]) => ({
      error: null,
      summary,
      visitors,
    }))
    .catch((error: unknown) => {
      console.error("Failed to load profile visitors", error);

      return {
        error,
        summary: emptyVisitSummary,
        visitors: [],
      };
    });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileVisitorsPageView
        hasError={Boolean(result.error)}
        locale={locale}
        summary={result.summary}
        visitors={result.visitors}
      />
    </PageContainer>
  );
}
