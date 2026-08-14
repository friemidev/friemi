import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileInvitePageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { getReferralStats } from "@/features/referrals/queries/getReferralDashboard";
import { buildReferralLink } from "@/features/referrals/services/referrals";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type ProfileInvitePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

const emptyReferralStats = {
  boundReferral: null,
  firstParticipationCount: 0,
  friendshipAcceptedCount: 0,
  invitedCount: 0,
  recentReferrals: [],
};

export default async function ProfileInvitePage({
  params,
}: ProfileInvitePageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/invite");
  const result = await getReferralStats(profile.id)
    .then((stats) => ({
      error: null,
      stats,
    }))
    .catch((error: unknown) => {
      console.error("Failed to load referral dashboard", error);

      return {
        error,
        stats: emptyReferralStats,
      };
    });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileInvitePageView
        friendCode={profile.friendCode}
        hasError={Boolean(result.error)}
        locale={locale}
        referralLink={
          profile.friendCode ? buildReferralLink(locale, profile.friendCode) : null
        }
        stats={result.stats}
      />
    </PageContainer>
  );
}
