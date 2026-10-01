import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessJoinClient } from "@/features/game-tools/components/DrawGuessJoinClient";

export default async function DrawGuessJoinPage({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale, code } = await params;
  return <PageContainer className="max-w-[45rem] pb-24 pt-6" mobileSafeBottom mobileSafeTop><DrawGuessJoinClient code={code} locale={locale} /></PageContainer>;
}
