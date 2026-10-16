import { notFound } from "next/navigation";
import { hasClerkKeys } from "@/lib/clerk";
import { DoudizhuEntryClient } from "@/features/game-tools/components/DoudizhuEntryClient";
import { DoudizhuEntryGuard } from "@/features/game-tools/components/DoudizhuEntryGuard";
import { isDoudizhuEnabled } from "@/features/game-tools/doudizhuFlags";
export default async function JoinPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  if (!isDoudizhuEnabled() || !/^[A-Z0-9]{6,8}$/i.test(code)) notFound();
  const { getDdzProfile } = await import("@/features/game-tools/doudizhuAuth");
  const profile = await getDdzProfile();
  const Entry = hasClerkKeys() ? DoudizhuEntryGuard : DoudizhuEntryClient;
  return (
    <Entry
      initialClerkUserId={profile?.clerkUserId}
      locale={locale}
      initialCode={code.toUpperCase()}
    />
  );
}
