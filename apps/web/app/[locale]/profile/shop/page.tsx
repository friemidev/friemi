import { PageContainer } from "@/components/layout/PageContainer";
import {
  getProfileShopGiftCatalog,
  getProfileShopNegativeGiftCatalog,
} from "@/features/charm/queries/getProfileShop";
import { getProfileShopGiftRecipients } from "@/features/charm/queries/getProfileShopGiftRecipients";
import { getFriemiCoinBalance } from "@/features/charm/queries/getFriemiCoinBalance";
import { ProfileShopPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type ProfileShopPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ProfileShopPage({
  params,
}: ProfileShopPageProps) {
  const { locale } = await params;

  const profile = await ensureCurrentUserProfile(locale, "/profile/shop");
  const gifts = getProfileShopGiftCatalog(locale);
  const negativeGifts = getProfileShopNegativeGiftCatalog(locale);
  const [coinBalance, giftRecipients] = await Promise.all([
    getFriemiCoinBalance(profile.id),
    getProfileShopGiftRecipients(profile.id),
  ]);

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileShopPageView
        coinBalance={coinBalance}
        giftRecipients={giftRecipients}
        gifts={gifts}
        locale={locale}
        negativeGifts={negativeGifts}
      />
    </PageContainer>
  );
}
