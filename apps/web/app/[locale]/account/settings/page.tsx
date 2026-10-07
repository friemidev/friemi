import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ChevronRight, Languages } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
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
    accountSettings: "登录方式",
    accountSettingsHint: "邮箱、密码与验证方式",
    accountSecurity: "账号与安全",
    accountSecurityHint: "联系方式、隐私与删除账号",
    activityPriorityAdmin: "活动权重管理",
    activityPriorityHint: "调整平台活动的展示顺序",
    analyticsAdmin: "运营数据",
    analyticsHint: "查看访问、活动与社区数据",
    reportsAdmin: "举报处理",
    reportsHint: "查看并处理用户举报",
    merchantAdmin: "店铺管理",
    merchantAdminHint: "查看店铺、绑定店家并管理优惠券",
    itemAdmin: "物品管理",
    itemAdminHint: "创建票券、分配物品与查看记录",
    officialMessagesAdmin: "官方消息发布",
    officialMessagesHint: "创建和发布平台消息",
    language: "语言",
    languageHint: "选择界面显示语言",
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
    accountSettings: "Sign-in methods",
    accountSettingsHint: "Email, password, and verification",
    accountSecurity: "Account & security",
    accountSecurityHint: "Contact details, privacy, and account deletion",
    activityPriorityAdmin: "Activity priority admin",
    activityPriorityHint: "Set the order of platform activities",
    analyticsAdmin: "Analytics",
    analyticsHint: "Review visits, activities, and community data",
    reportsAdmin: "Reports",
    reportsHint: "Review and resolve user reports",
    merchantAdmin: "Store management",
    merchantAdminHint: "View stores, connect owners, and manage coupons",
    itemAdmin: "Item management",
    itemAdminHint: "Create tickets, allocate items, and review history",
    officialMessagesAdmin: "Official messages",
    officialMessagesHint: "Create and publish platform messages",
    language: "Language",
    languageHint: "Choose the interface language",
    signOut: "Sign out",
  },
  fr: {
    metadataTitle: "Réglages",
    title: "Réglages",
    description: "Gérez la langue, le profil, la sécurité et la connexion.",
    backToProfile: "Retour au profil",
    accountGroup: "Compte",
    adminGroup: "Gestion",
    accountSettings: "Méthodes de connexion",
    accountSettingsHint: "E-mail, mot de passe et vérification",
    accountSecurity: "Compte et sécurité",
    accountSecurityHint:
      "Coordonnées, confidentialité et suppression du compte",
    activityPriorityAdmin: "Priorité des activités",
    activityPriorityHint: "Définir l’ordre des activités de la plateforme",
    analyticsAdmin: "Statistiques",
    analyticsHint: "Consulter les visites, activités et données de communauté",
    reportsAdmin: "Signalements",
    reportsHint: "Examiner et traiter les signalements",
    merchantAdmin: "Gestion des boutiques",
    merchantAdminHint:
      "Voir les boutiques, lier les gérants et gérer les coupons",
    itemAdmin: "Gestion des objets",
    itemAdminHint:
      "Créer des billets, attribuer des objets et consulter l’historique",
    officialMessagesAdmin: "Messages officiels",
    officialMessagesHint: "Créer et publier des messages de la plateforme",
    language: "Langue",
    languageHint: "Choisir la langue de l’interface",
    signOut: "Déconnexion",
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

      <div className="mt-7">
        {profile ? (
          <AccountSettingsActionList
            accountGroupLabel={copy.accountGroup}
            accountSecurityLabel={copy.accountSecurity}
            accountSecurityHint={copy.accountSecurityHint}
            accountSettingsLabel={copy.accountSettings}
            accountSettingsHint={copy.accountSettingsHint}
            adminActivityPriorityLabel={
              isAdmin ? copy.activityPriorityAdmin : undefined
            }
            adminActivityPriorityHint={
              isAdmin ? copy.activityPriorityHint : undefined
            }
            adminAnalyticsLabel={isAdmin ? copy.analyticsAdmin : undefined}
            adminAnalyticsHint={isAdmin ? copy.analyticsHint : undefined}
            adminReportsLabel={isAdmin ? copy.reportsAdmin : undefined}
            adminReportsHint={isAdmin ? copy.reportsHint : undefined}
            adminMerchantLabel={isAdmin ? copy.merchantAdmin : undefined}
            adminMerchantHint={isAdmin ? copy.merchantAdminHint : undefined}
            adminItemLabel={isAdmin ? copy.itemAdmin : undefined}
            adminItemHint={isAdmin ? copy.itemAdminHint : undefined}
            adminGroupLabel={copy.adminGroup}
            adminOfficialMessagesLabel={
              isAdmin ? copy.officialMessagesAdmin : undefined
            }
            adminOfficialMessagesHint={
              isAdmin ? copy.officialMessagesHint : undefined
            }
            languageLabel={copy.language}
            languageHint={copy.languageHint}
            locale={locale}
            signOutLabel={copy.signOut}
          />
        ) : (
          <Link
            className="flex min-h-16 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/account/settings/language")}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fog text-forest">
              <Languages aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                {copy.language}
              </span>
              <span className="mt-0.5 block text-xs text-ink/65">
                {copy.languageHint}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 text-outline" />
          </Link>
        )}
      </div>
    </PageContainer>
  );
}
