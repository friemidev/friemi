import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileMomentsMobilePage } from "@/features/profile/components/ProfileMobileSubpages";
import {
  getProfileLikedMoments,
  getProfileMoments,
} from "@/features/profile/queries/getProfileMoments";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type ProfileMomentsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ProfileMomentsPage({
  params,
}: ProfileMomentsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/moments");
  const [moments, likedMoments] = await Promise.all([
    getProfileMoments(profile.id).catch((error: unknown) => {
      console.error("Failed to load profile moments", error);

      return [];
    }),
    getProfileLikedMoments(profile.id).catch((error: unknown) => {
      console.error("Failed to load profile liked moments", error);

      return [];
    }),
  ]);

  return (
    <PageContainer className="max-md:px-0 max-md:py-0">
      <ProfileMomentsMobilePage
        likedMoments={likedMoments}
        locale={locale}
        moments={moments}
      />
    </PageContainer>
  );
}
