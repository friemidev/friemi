import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileInvitePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProfileInvitePage({
  params,
}: ProfileInvitePageProps) {
  const { locale } = await params;

  await ensureCurrentUserProfile(locale, "/profile/invite");

  notFound();
}
