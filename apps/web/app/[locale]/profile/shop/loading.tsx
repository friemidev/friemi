import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileSubpageLoadingView } from "@/features/profile/components/ProfilePrivateSubpages";

export default function ProfileShopLoading() {
  return (
    <PageContainer className="max-md:px-0 max-md:py-0 md:py-8">
      <ProfileSubpageLoadingView />
    </PageContainer>
  );
}
