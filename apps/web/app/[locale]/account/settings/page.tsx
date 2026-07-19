import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountLanguageSettingsSection } from "@/features/account/components/AccountLanguageSettingsSection";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type AccountSettingsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const accountSettingsCopy = {
  "zh-CN": {
    metadataTitle: "账号设置",
    eyebrow: "账号设置",
    title: "账号设置",
    description: "管理你的账号偏好。",
    language: "语言",
  },
  en: {
    metadataTitle: "Account Settings",
    eyebrow: "Account Settings",
    title: "Account Settings",
    description: "Manage your account preferences.",
    language: "Language",
  },
  fr: {
    metadataTitle: "Parametres du compte",
    eyebrow: "Parametres du compte",
    title: "Parametres du compte",
    description: "Gerez vos preferences de compte.",
    language: "Langue",
  },
} as const;

export async function generateMetadata({
  params,
}: AccountSettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    accountSettingsCopy[locale as keyof typeof accountSettingsCopy] ??
    accountSettingsCopy["zh-CN"];

  return {
    title: copy.metadataTitle,
    description: copy.description,
  };
}

export default async function AccountSettingsPage({
  params,
}: AccountSettingsPageProps) {
  const { locale } = await params;
  const copy =
    accountSettingsCopy[locale as keyof typeof accountSettingsCopy] ??
    accountSettingsCopy["zh-CN"];

  await ensureCurrentUserProfile(locale, "/account/settings");

  return (
    <PageContainer className="max-w-2xl space-y-5 px-5 pb-28 pt-5 md:pt-8">
      <header className="md:rounded-2xl md:border md:border-[#D6D5B2] md:bg-white/85 md:p-6 md:shadow-[0_18px_48px_rgba(21,98,64,0.06)]">
        <Link
          href={withLocale(locale, "/profile")}
          className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1D1D1B] ring-1 ring-[#ECE6D5] md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="hidden items-center gap-2 rounded-full bg-[#FEFFF9] px-3 py-1 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E] md:inline-flex">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h1 className="text-[26px] font-black leading-tight tracking-normal text-ink md:mt-4 md:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#156240] md:mt-3 md:text-base">
          {copy.description}
        </p>
      </header>

      <AccountLanguageSettingsSection label={copy.language} locale={locale} />
    </PageContainer>
  );
}
