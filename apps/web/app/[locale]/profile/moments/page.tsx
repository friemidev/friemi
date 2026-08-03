import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileMomentsMobilePage } from "@/features/profile/components/ProfileMobileSubpages";
import { getProfileMoments } from "@/features/profile/queries/getProfileMoments";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileMomentsPageProps = {
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

export default async function ProfileMomentsPage({
  params,
}: ProfileMomentsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/moments");
  const moments = await getProfileMoments(profile.id).catch((error: unknown) => {
    console.error("Failed to load profile moments", error);

    return [];
  });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0">
      <ProfileMomentsMobilePage locale={locale} moments={moments} />
    </PageContainer>
  );
}
