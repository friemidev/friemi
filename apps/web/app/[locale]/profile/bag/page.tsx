import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileBagPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProfileBagPage({ params }: ProfileBagPageProps) {
  const { locale } = await params;

  await ensureCurrentUserProfile(locale, "/profile/bag");

  notFound();
}
