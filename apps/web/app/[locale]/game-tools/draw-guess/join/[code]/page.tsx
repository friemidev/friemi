import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessJoinClient } from "@/features/game-tools/components/DrawGuessJoinClient";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";

export default async function DrawGuessJoinPage({ params, searchParams }: {
  params: Promise<{ locale: string; code: string }>;
  searchParams: Promise<{ roomId?: string | string[] }>;
}) {
  const [{ locale, code }, query] = await Promise.all([params, searchParams]);
  const expectedRoomId = Array.isArray(query.roomId) ? query.roomId[0] : query.roomId;
  const profileId = await getExistingDrawGuessProfileId();
  return <PageContainer className="max-w-[45rem] pb-24 pt-6" mobileSafeBottom mobileSafeTop><DrawGuessJoinClient code={code} expectedRoomId={expectedRoomId} locale={locale} profileId={profileId} /></PageContainer>;
}
