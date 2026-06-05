import { PageContainer } from "@/components/layout/PageContainer";
import { LocalizedBrandLoader } from "@/components/ui/LocalizedBrandLoader";

export default function LocaleLoading() {
  return (
    <PageContainer className="flex min-h-[58vh] items-center justify-center py-12">
      <LocalizedBrandLoader size="lg" showLabel />
    </PageContainer>
  );
}
