import { PageContainer } from "@/components/layout/PageContainer";
import { getProfileGiftWall } from "@/features/charm/queries/getProfileGiftWall";
import { ProfileGiftWallPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileGiftWallPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
const emptyGiftWall = {
  lastGiftAt: null,
  senderCount: 0,
  topGifts: [],
  topSenders: [],
  totalCharm: 0,
  totalGiftCount: 0,
};

export default async function ProfileGiftWallPage({
  params,
}: ProfileGiftWallPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/gift-wall");
  const result = await getProfileGiftWall(profile.id)
    .then((giftWall) => ({
      error: null,
      giftWall,
    }))
    .catch((error: unknown) => {
      console.error("Failed to load profile gift wall", error);

      return {
        error,
        giftWall: emptyGiftWall,
      };
    });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileGiftWallPageView
        giftWall={result.giftWall}
        hasError={Boolean(result.error)}
        locale={locale}
      />
    </PageContainer>
  );
}
