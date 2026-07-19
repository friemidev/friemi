import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Settings } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountLanguageSettingsSection } from "@/features/account/components/AccountLanguageSettingsSection";
import { AccountSettingsActionList } from "@/features/account/components/AccountSettingsActionList";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type AccountSettingsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const accountSettingsCopy = {
  "zh-CN": {
    metadataTitle: "设置",
    title: "设置",
    description: "管理账号资料、安全和登录状态。",
    accountSettings: "账号设置",
    accountSecurity: "账号与安全",
    language: "语言",
    signOut: "退出登录",
  },
  en: {
    metadataTitle: "Settings",
    title: "Settings",
    description: "Manage account profile, security, and sign-in state.",
    accountSettings: "Account settings",
    accountSecurity: "Account & security",
    language: "Language",
    signOut: "Sign out",
  },
  fr: {
    metadataTitle: "Reglages",
    title: "Reglages",
    description: "Gerez le profil, la securite et la connexion du compte.",
    accountSettings: "Parametres du compte",
    accountSecurity: "Compte et securite",
    language: "Langue",
    signOut: "Deconnexion",
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
    <PageContainer className="max-w-2xl space-y-5 px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:pt-8">
      <header>
        <Link
          href={withLocale(locale, "/profile")}
          className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1D1D1B] shadow-[0_8px_18px_rgba(17,18,16,0.05)] ring-1 ring-[#ECE6D5]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="inline-flex items-center gap-2 rounded-full bg-[#FEFFF9] px-3 py-1 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E]">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.title}
        </p>
        <h1 className="mt-4 text-[26px] font-black leading-tight tracking-normal text-ink md:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#156240] md:text-base">
          {copy.description}
        </p>
      </header>

      <AccountLanguageSettingsSection label={copy.language} locale={locale} />

      <AccountSettingsActionList
        accountSecurityLabel={copy.accountSecurity}
        accountSettingsLabel={copy.accountSettings}
        locale={locale}
        signOutLabel={copy.signOut}
      />
    </PageContainer>
  );
}
