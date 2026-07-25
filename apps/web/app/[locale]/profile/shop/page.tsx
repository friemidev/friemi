import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { getProfileShopGiftCatalog } from "@/features/charm/queries/getProfileShop";
import { getProfileShopGiftRecipients } from "@/features/charm/queries/getProfileShopGiftRecipients";
import { ProfileShopPageView } from "@/features/profile/components/ProfilePrivateSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileShopPageProps = {
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

export default async function ProfileShopPage({
  params,
}: ProfileShopPageProps) {
  const { locale } = await params;

  const profile = await ensureCurrentUserProfile(locale, "/profile/shop");
  const gifts = getProfileShopGiftCatalog(locale);
  const giftRecipients = await getProfileShopGiftRecipients(profile.id);

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileShopPageView
        giftRecipients={giftRecipients}
        gifts={gifts}
        locale={locale}
      />
    </PageContainer>
  );
}
