import { PageContainer } from "@/components/layout/PageContainer";
import {
  getProfileShopGiftCatalog,
  getProfileShopNegativeGiftCatalog,
} from "@/features/charm/queries/getProfileShop";
import { getProfileShopGiftRecipients } from "@/features/charm/queries/getProfileShopGiftRecipients";
import { getFriemiCoinBalance } from "@/features/charm/queries/getFriemiCoinBalance";
import { getProfileShopProductId } from "@/features/charm/profileShopProducts";
import { ProfileShopPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { noIndexMetadata } from "@/lib/seo";

type ProfileShopPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    product?: string | string[];
    recharge?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function ProfileShopPage({
  params,
  searchParams,
}: ProfileShopPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const rechargeParam = Array.isArray(resolvedSearchParams.recharge)
    ? resolvedSearchParams.recharge[0]
    : resolvedSearchParams.recharge;
  const selectedProductId = getProfileShopProductId(
    resolvedSearchParams.product,
  );
  const returnSearchParams = new URLSearchParams();

  if (selectedProductId) {
    returnSearchParams.set("product", selectedProductId);
  }

  if (rechargeParam === "1") {
    returnSearchParams.set("recharge", "1");
  }

  const returnQuery = returnSearchParams.toString();
  const returnPath = `/profile/shop${returnQuery ? `?${returnQuery}` : ""}`;

  const profile = await ensureCurrentUserProfile(locale, returnPath);
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
        openRecharge={rechargeParam === "1"}
        selectedProductId={selectedProductId}
      />
    </PageContainer>
  );
}
