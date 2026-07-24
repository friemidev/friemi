import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileAchievementsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProfileAchievementsPage({
  params,
}: ProfileAchievementsPageProps) {
  const { locale } = await params;

  await ensureCurrentUserProfile(locale, "/profile/achievements");

  notFound();
}
