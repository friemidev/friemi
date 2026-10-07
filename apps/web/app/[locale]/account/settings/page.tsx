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
    backToProfile: "返回个人主页",
    accountGroup: "账号",
    adminGroup: "管理工具",
    accountSettings: "账号设置",
    accountSecurity: "账号与安全",
    activityPriorityAdmin: "活动权重管理",
    couponMerchantAdmin: "店铺与物品",
    officialMessagesAdmin: "官方消息发布",
    language: "语言",
    signOut: "退出登录",
  },
  en: {
    metadataTitle: "Settings",
    title: "Settings",
    description:
      "Manage language, account profile, security, and sign-in state.",
    backToProfile: "Back to profile",
    accountGroup: "Account",
    adminGroup: "Management",
    accountSettings: "Account settings",
    accountSecurity: "Account & security",
    activityPriorityAdmin: "Activity priority admin",
    couponMerchantAdmin: "Stores & items",
    officialMessagesAdmin: "Official messages",
    language: "Language",
    signOut: "Sign out",
  },
  fr: {
    metadataTitle: "Reglages",
    title: "Reglages",
    description: "Gerez la langue, le profil, la securite et la connexion.",
    backToProfile: "Retour au profil",
    accountGroup: "Compte",
    adminGroup: "Gestion",
    accountSettings: "Parametres du compte",
    accountSecurity: "Compte et securite",
    activityPriorityAdmin: "Priorite des activites",
    couponMerchantAdmin: "Boutiques et objets",
    officialMessagesAdmin: "Messages officiels",
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
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] max-w-xl px-5 pb-16 md:min-h-[70vh] md:py-10">
      <header className="flex min-h-11 items-center gap-3">
        <Link
          aria-label={copy.backToProfile}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-ink transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, "/profile")}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {copy.title}
        </h1>
      </header>

      <div className="mt-8 space-y-8">
        <AccountLanguageSettingsSection label={copy.language} locale={locale} />

        {profile ? (
          <AccountSettingsActionList
            accountGroupLabel={copy.accountGroup}
            accountSecurityLabel={copy.accountSecurity}
            accountSettingsLabel={copy.accountSettings}
            adminActivityPriorityLabel={
              isAdmin ? copy.activityPriorityAdmin : undefined
            }
            adminCouponMerchantLabel={
              isAdmin ? copy.couponMerchantAdmin : undefined
            }
            adminGroupLabel={copy.adminGroup}
            adminOfficialMessagesLabel={
              isAdmin ? copy.officialMessagesAdmin : undefined
            }
            locale={locale}
            signOutLabel={copy.signOut}
          />
        ) : null}
      </div>
    </PageContainer>
  );
}
