import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DiceOnlineEntry } from "@/features/game-tools/components/DiceOnlineEntry";
import { isDicePreviewEnabled } from "@/features/game-tools/diceAvailability";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
export default async function DiceOnlinePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string }> }) {
  if (!isDicePreviewEnabled()) notFound();
  const { locale } = await params;
  const { code } = await searchParams;
  const profileId = await getExistingDrawGuessProfileId();
  return <PageContainer className="max-w-[46rem] pb-20 pt-5" mobileSafeBottom mobileSafeTop><DiceOnlineEntry locale={locale} profileId={profileId} initialCode={code ?? ""} /></PageContainer>;
}
