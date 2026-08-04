import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileAchievementsPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { syncProfileAchievements } from "@/features/achievements/services/achievements";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileAchievementsPageProps = {
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

export default async function ProfileAchievementsPage({
  params,
}: ProfileAchievementsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/achievements");
  const result = await syncProfileAchievements(profile.id)
    .then((data) => ({
      error: null,
      items: data.progress,
    }))
    .catch((error: unknown) => {
      console.error("Failed to load profile achievements", error);

      return {
        error,
        items: [],
      };
    });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileAchievementsPageView
        hasError={Boolean(result.error)}
        items={result.items}
        locale={locale}
      />
    </PageContainer>
  );
}
