import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DiceOnlineEntry } from "@/features/game-tools/components/DiceOnlineEntry";
import { isDiceEnabled } from "@/features/game-tools/diceAvailability";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";
export default async function DiceOnlinePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string }> }) {
  if (!isDiceEnabled()) notFound();
  const { locale } = await params;
  const { code } = await searchParams;
  const profileId = await getExistingDrawGuessProfileId();
  return <PageContainer className="max-w-[46rem] dice-online-page pb-4 pt-5" mobileSafeTop><DiceOnlineEntry locale={locale} profileId={profileId} initialCode={code ?? ""} /></PageContainer>;
}
