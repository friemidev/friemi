import { PageContainer } from "@/components/layout/PageContainer";
import { blindBoxFragmentExchangeCount } from "@/features/charm/charm";
import { getProfileBag } from "@/features/charm/queries/getProfileBag";
import { ProfileBagPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type ProfileBagPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    couponStatus?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ProfileBagPage({
  params,
  searchParams,
}: ProfileBagPageProps) {
  const { locale } = await params;
  const { couponStatus } = await searchParams;
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
          coupons: [],
          coinBalance: {
            balance: 0,
            earnedTotal: 0,
            spentTotal: 0,
          },
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
        notice={
          couponStatus === "claimed" || couponStatus === "already-claimed"
            ? couponStatus
            : null
        }
      />
    </PageContainer>
  );
}
