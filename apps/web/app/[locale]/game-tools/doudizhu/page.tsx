import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasClerkKeys } from "@/lib/clerk";
import { DoudizhuEntryClient } from "@/features/game-tools/components/DoudizhuEntryClient";
import { DoudizhuEntryGuard } from "@/features/game-tools/components/DoudizhuEntryGuard";
import { getDoudizhuCopy } from "@/features/game-tools/doudizhuCopy";
import { isDoudizhuEnabled } from "@/features/game-tools/doudizhuFlags";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: `${getDoudizhuCopy(locale).title} · Friemi`,
    robots: { index: false, follow: false },
  };
}
export default async function DoudizhuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (!isDoudizhuEnabled()) notFound();
  const { getDdzProfile } = await import("@/features/game-tools/doudizhuAuth");
  const profile = await getDdzProfile();
  const { getActiveGameToolRoomForProfile } =
    await import("@/features/game-tools/gameToolRooms");
  const active = profile
    ? await getActiveGameToolRoomForProfile({ profileId: profile.id })
    : null;
  const Entry = hasClerkKeys() ? DoudizhuEntryGuard : DoudizhuEntryClient;
  return (
    <Entry
      initialClerkUserId={profile?.clerkUserId}
      initialResume={
        active?.kind === "DOUDIZHU"
          ? { id: active.id, code: active.code }
          : null
      }
      locale={(await params).locale}
      preview={process.env.NODE_ENV !== "production"}
    />
  );
}
