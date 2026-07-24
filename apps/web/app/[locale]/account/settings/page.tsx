import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountLanguageSettingsSection } from "@/features/account/components/AccountLanguageSettingsSection";
import { AccountSettingsActionList } from "@/features/account/components/AccountSettingsActionList";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
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
    description: "管理语言偏好、账号资料、安全和登录状态。",
    accountSettings: "账号设置",
    accountSecurity: "账号与安全",
    topNewsAdmin: "Top News 管理",
    language: "语言",
    signOut: "退出登录",
  },
  en: {
    metadataTitle: "Settings",
    title: "Settings",
    description:
      "Manage language, account profile, security, and sign-in state.",
    accountSettings: "Account settings",
    accountSecurity: "Account & security",
    topNewsAdmin: "Top News admin",
    language: "Language",
    signOut: "Sign out",
  },
  fr: {
    metadataTitle: "Reglages",
    title: "Reglages",
    description: "Gerez la langue, le profil, la securite et la connexion.",
    accountSettings: "Parametres du compte",
    accountSecurity: "Compte et securite",
    topNewsAdmin: "Admin Top News",
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

  const [profile, isAdmin] = await Promise.all([
    getOptionalCurrentUserProfileSnapshot(),
    isCurrentUserAdmin(),
  ]);

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:1.15rem] [--app-mobile-page-bottom-gap:1.75rem] relative isolate max-w-xl overflow-hidden px-5 md:min-h-[70vh] md:pb-12 md:pt-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,#FFF5E6_0%,rgba(254,255,249,0)_100%)]" />
        <div className="absolute -right-20 top-20 h-48 w-48 rounded-full bg-[#DEEBFF]/70 blur-3xl" />
        <div className="absolute -left-24 bottom-16 h-56 w-56 rounded-full bg-[#8AB68E]/24 blur-3xl" />
      </div>

      <header className="relative">
        <Link
          href={withLocale(locale, "/profile")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FEFFF9]/76 text-[#1D1D1B] shadow-[0_14px_34px_rgba(21,98,64,0.1)] ring-1 ring-[#D6D5B2]/72 backdrop-blur transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="mt-8 text-[2.75rem] font-black leading-none tracking-normal text-[#1D1D1B] md:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[24rem] text-[15px] font-semibold leading-7 text-[#156240]/78 md:text-base">
          {copy.description}
        </p>
      </header>

      <div className="mt-9 space-y-8">
        <AccountLanguageSettingsSection label={copy.language} locale={locale} />

        {profile ? (
          <AccountSettingsActionList
            accountSecurityLabel={copy.accountSecurity}
            accountSettingsLabel={copy.accountSettings}
            adminTopNewsLabel={isAdmin ? copy.topNewsAdmin : undefined}
            locale={locale}
            signOutLabel={copy.signOut}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
