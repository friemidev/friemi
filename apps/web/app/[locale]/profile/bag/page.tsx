import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { blindBoxFragmentExchangeCount } from "@/features/charm/charm";
import { getProfileBag } from "@/features/charm/queries/getProfileBag";
import { ProfileBagPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileBagPageProps = {
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

export default async function ProfileBagPage({ params }: ProfileBagPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/bag");
  const result = await getProfileBag(profile.id)
    .then((bag) => ({
      bag,
      error: null,
    }))
    .catch((error: unknown) => {
      console.error("Failed to load profile bag", error);

      return {
        bag: {
          availableCheckCount: 0,
          blindBoxCheckCount: 0,
          checks: [],
          fragmentBalance: {
            canRedeem: false,
            current: 0,
            redeemedBlindBoxCount: 0,
            required: blindBoxFragmentExchangeCount,
          },
        },
        error,
      };
    });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileBagPageView
        bag={result.bag}
        hasError={Boolean(result.error)}
        locale={locale}
      />
    </PageContainer>
  );
}
