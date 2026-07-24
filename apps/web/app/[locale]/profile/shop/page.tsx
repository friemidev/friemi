import { notFound } from "next/navigation";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ProfileShopPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProfileShopPage({ params }: ProfileShopPageProps) {
  const { locale } = await params;

  await ensureCurrentUserProfile(locale, "/profile/shop");

  notFound();
}
