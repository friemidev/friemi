import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileVisitorsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProfileVisitorsPage({
  params,
}: ProfileVisitorsPageProps) {
  const { locale } = await params;

  await ensureCurrentUserProfile(locale, "/profile/visitors");

  notFound();
}
