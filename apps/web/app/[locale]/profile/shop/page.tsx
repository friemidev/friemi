import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
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

export default async function ProfileShopPage({ params }: ProfileShopPageProps) {
  const { locale } = await params;

  await ensureCurrentUserProfile(locale, "/profile/shop");

  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileShopPageView locale={locale} />
    </PageContainer>
  );
}
