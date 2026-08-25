import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileSetupForm } from "@/features/profile/components/ProfileSetupForm";
import { ensureCurrentUserProfile } from "@/lib/auth";
import {
  authRedirectParamName,
  getAuthRedirectFallback,
  normalizeAuthRedirectTarget,
} from "@/lib/auth-redirect";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type ProfileSetupPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    [authRedirectParamName]?: string | string[];
  }>;
};

function getProfileSetupPageCopy(locale: string) {
  if (locale === "fr") {
    return {
      description:
        "Choisissez un avatar ou importez une photo, puis indiquez le pseudo visible par les autres membres.",
      title: "Configurez votre profil",
    };
  }

  if (locale === "en") {
    return {
      description:
        "Choose a default avatar or upload a photo, then set the nickname other members will see.",
      title: "Set up your profile",
    };
  }

  return {
    description: "选择默认头像或上传照片，再设置其他人看到的昵称。",
    title: "完善你的资料",
  };
}

export async function generateMetadata({
  params,
}: ProfileSetupPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getProfileSetupPageCopy(locale);

  return {
    ...buildNoIndexMetadata({
      canonicalPath: withLocale(locale, "/profile/setup"),
    }),
    description: copy.description,
    title: copy.title,
  };
}

export default async function ProfileSetupPage({
  params,
  searchParams,
}: ProfileSetupPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const fallback = getAuthRedirectFallback(locale);
  const normalizedReturnTo = normalizeAuthRedirectTarget(
    locale,
    query?.[authRedirectParamName],
  );
  const setupPath = withLocale(locale, "/profile/setup");
  const returnTo = normalizedReturnTo.startsWith(setupPath)
    ? fallback
    : normalizedReturnTo;
  const profile = await ensureCurrentUserProfile(locale, "/profile/setup");
  const copy = getProfileSetupPageCopy(locale);

  return (
    <PageContainer className="min-h-[100svh] max-w-xl bg-white px-5 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] sm:px-8">
      <header className="mb-7">
        <h1 className="text-2xl font-bold leading-tight text-[#1D1D1B]">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#697066]">
          {copy.description}
        </p>
      </header>

      <ProfileSetupForm
        avatarUrl={profile.avatarUrl}
        locale={locale}
        nickname={profile.nickname}
        returnTo={returnTo}
      />
    </PageContainer>
  );
}
