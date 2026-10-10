import { PageContainer } from "@/components/layout/PageContainer";
import { blindBoxFragmentExchangeCount } from "@/features/charm/charm";
import { getProfileBag } from "@/features/charm/queries/getProfileBag";
import { ProfileBagPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ReceivedTicketsSeen } from "@/features/inventory/components/ReceivedTicketsSeen";
import {
  bagTicketPageSize,
  type BagTicketFilter,
} from "@/features/inventory/services/inventoryBagQueries";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type ProfileBagPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    couponStatus?: string;
    filter?: string;
    page?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ProfileBagPage({
  params,
  searchParams,
}: ProfileBagPageProps) {
  const { locale } = await params;
  const { couponStatus, filter, page } = await searchParams;
  const ticketFilter: BagTicketFilter =
    filter === "all" || filter === "used" ? filter : "available";
  const ticketPage = Number.parseInt(page ?? "1", 10);
  const profile = await ensureCurrentUserProfile(locale, "/profile/bag");
  const pageOpenedAt = new Date().toISOString();
  const result = await getProfileBag(profile.id, {
    ticketFilter,
    ticketPage,
  })
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
          inventoryItems: [],
          ticketPage: {
            items: [],
            page: 1,
            pageSize: bagTicketPageSize,
            total: 0,
          },
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
      {!result.error && (
        <ReceivedTicketsSeen locale={locale} pageOpenedAt={pageOpenedAt} />
      )}
      <ProfileBagPageView
        bag={result.bag}
        hasError={Boolean(result.error)}
        itemFilter={ticketFilter}
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
