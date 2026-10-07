import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ChevronRight,
  Mail,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountDeletionEntryCard } from "@/features/account/components/AccountDeletionEntryCard";
import { AccountContactBindingsSection } from "@/features/account/components/AccountContactBindingsSection";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { hasClerkKeys } from "@/lib/clerk";
import { withLocale } from "@/lib/routes";

type AccountSecurityPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const accountSecurityCopy = {
  "zh-CN": {
    metadataTitle: "账号与安全",
    back: "返回设置",
    description:
      "查看账号标识、联系方式绑定、隐私入口，并在需要时从 App 内发起账号删除。",
    profileTitle: "账号信息",
    loginEmail: "登录邮箱",
    friendCode: "个人码",
    missing: "未设置",
    privacyTitle: "隐私与支持",
    privacyLink: "查看隐私政策",
    safetyLink: "查看社区安全说明",
    supportTitle: "联系支持",
    supportEmail: "friemi.dev@gmail.com",
    deletion: {
      title: "删除账号",
      body: "删除后将退出登录；部分历史记录可能按隐私政策保留。",
      openConfirm: "查看删除影响",
      confirmTitle: "删除前请确认这些影响",
      impactItems: [
        "个人资料会被停用，昵称、联系方式和设备 token 将在删除流程中清理或失效。",
        "你将退出登录，之后不能继续使用当前账号参与报名、消息和通知。",
        "历史活动、报名、消息和举报记录可能会按隐私政策保留必要记录或做匿名化处理。",
      ],
      acknowledgeLabel: "我了解删除账号可能不可恢复，并希望继续。",
      submit: "确认删除账号",
      submitting: "正在删除...",
      success: "提交后会清理账号资料并退出登录。",
      error: "删除失败，请稍后重试或通过邮箱联系我们。",
      cancel: "暂不删除",
    },
  },
  en: {
    metadataTitle: "Account & Security",
    back: "Back to settings",
    description:
      "Review account identifiers, contact bindings, privacy links, and initiate account deletion from inside the app when needed.",
    profileTitle: "Account details",
    loginEmail: "Login email",
    friendCode: "Friemi ID",
    missing: "Not set",
    privacyTitle: "Privacy & support",
    privacyLink: "View Privacy Policy",
    safetyLink: "View Community Safety",
    supportTitle: "Contact support",
    supportEmail: "friemi.dev@gmail.com",
    deletion: {
      title: "Delete account",
      body: "Deletion signs you out. Some history may be retained under the privacy policy.",
      openConfirm: "Review deletion effects",
      confirmTitle: "Before deleting, confirm these effects",
      impactItems: [
        "Your profile will be deactivated, and contact information plus device tokens will be cleaned up or disabled.",
        "You will be signed out and can no longer use this account for signups, messages, or notifications.",
        "Historical activity, signup, message, and report records may be retained as necessary or anonymized according to the privacy policy.",
      ],
      acknowledgeLabel:
        "I understand account deletion may be irreversible and want to continue.",
      submit: "Confirm account deletion",
      submitting: "Deleting...",
      success: "Submitting will clean up account data and sign you out.",
      error: "Deletion failed. Please try again later or contact us by email.",
      cancel: "Keep account",
    },
  },
  fr: {
    metadataTitle: "Compte et securite",
    back: "Retour aux réglages",
    description:
      "Consultez les informations du compte, les coordonnees liees, les liens de confidentialite et lancez la suppression du compte depuis l'app si besoin.",
    profileTitle: "Informations du compte",
    loginEmail: "E-mail de connexion",
    friendCode: "ID Friemi",
    missing: "Non renseigné",
    privacyTitle: "Confidentialité et aide",
    privacyLink: "Voir la politique de confidentialite",
    safetyLink: "Voir la securite communautaire",
    supportTitle: "Contacter l'assistance",
    supportEmail: "friemi.dev@gmail.com",
    deletion: {
      title: "Supprimer le compte",
      body: "La suppression vous déconnecte. Certains historiques peuvent être conservés selon la politique de confidentialité.",
      openConfirm: "Voir les conséquences",
      confirmTitle: "Avant de supprimer, confirmez ces effets",
      impactItems: [
        "Votre profil sera desactive et les coordonnees ainsi que les tokens d'appareil seront nettoyes ou desactives.",
        "Vous serez deconnecte et ne pourrez plus utiliser ce compte pour les inscriptions, messages ou notifications.",
        "Certains historiques peuvent etre conserves si necessaire ou anonymises selon la politique de confidentialite.",
      ],
      acknowledgeLabel:
        "Je comprends que la suppression peut etre irreversible et souhaite continuer.",
      submit: "Confirmer la suppression",
      submitting: "Suppression...",
      success:
        "La soumission nettoie les donnees du compte et vous deconnecte.",
      error:
        "La suppression a echoue. Reessayez plus tard ou contactez-nous par e-mail.",
      cancel: "Conserver le compte",
    },
  },
} as const;

export async function generateMetadata({
  params,
}: AccountSecurityPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy =
    accountSecurityCopy[locale as keyof typeof accountSecurityCopy] ??
    accountSecurityCopy["zh-CN"];

  return {
    title: copy.metadataTitle,
    description: copy.description,
  };
}

export default async function AccountSecurityPage({
  params,
}: AccountSecurityPageProps) {
  const { locale } = await params;
  const copy =
    accountSecurityCopy[locale as keyof typeof accountSecurityCopy] ??
    accountSecurityCopy["zh-CN"];
  const profile = await ensureCurrentUserProfile(locale, "/account/security");

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] max-w-xl px-5 pb-16 md:min-h-[70vh] md:py-10">
      <header className="flex min-h-11 items-center gap-3">
        <Link
          aria-label={copy.back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-ink transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, "/account/settings")}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {copy.metadataTitle}
        </h1>
      </header>

      <div className="mt-8 space-y-8">
        <section aria-labelledby="account-security-details-heading">
          <h2
            className="mb-2 px-2 text-sm font-bold text-ink/70"
            id="account-security-details-heading"
          >
            {copy.profileTitle}
          </h2>
          <dl className="space-y-0.5">
            <AccountField
              label={copy.loginEmail}
              missing={copy.missing}
              value={profile.email}
            />
            <AccountField
              label={copy.friendCode}
              missing={copy.missing}
              value={profile.friendCode}
            />
          </dl>
        </section>

        <AccountContactBindingsSection
          initialContactEmail={profile.contactEmail}
          initialPhone={profile.phone}
          initialWechatId={profile.wechatId}
          loginEmail={profile.email}
          locale={locale}
        />

        <section aria-labelledby="account-security-privacy-heading">
          <h2
            className="mb-2 px-2 text-sm font-bold text-ink/70"
            id="account-security-privacy-heading"
          >
            {copy.privacyTitle}
          </h2>
          <nav className="space-y-0.5">
            <SecurityLink
              href={withLocale(locale, "/privacy")}
              icon={ScrollText}
              label={copy.privacyLink}
            />
            <SecurityLink
              href={withLocale(locale, "/safety")}
              icon={ShieldCheck}
              label={copy.safetyLink}
            />
            <SecurityLink
              href={`mailto:${copy.supportEmail}`}
              icon={Mail}
              label={copy.supportTitle}
              secondary={copy.supportEmail}
            />
          </nav>
        </section>

        <AccountDeletionEntryCard
          clerkEnabled={hasClerkKeys()}
          copy={copy.deletion}
          locale={locale}
        />
      </div>
    </PageContainer>
  );
}

function AccountField({
  label,
  missing,
  value,
}: {
  label: string;
  missing: string;
  value?: string | null;
}) {
  return (
    <div className="flex min-h-14 min-w-0 items-center justify-between gap-4 rounded-xl px-2 py-2">
      <dt className="shrink-0 text-sm font-medium text-ink/70">{label}</dt>
      <dd className="min-w-0 break-all text-right text-sm font-semibold text-ink">
        {value?.trim() || missing}
      </dd>
    </div>
  );
}

function SecurityLink({
  href,
  icon: Icon,
  label,
  secondary,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  secondary?: string;
}) {
  return (
    <Link
      className="group flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      href={href}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fog text-forest">
        <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {secondary ? (
          <span className="block break-all text-xs text-ink/70">
            {secondary}
          </span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-outline transition group-hover:translate-x-0.5"
      />
    </Link>
  );
}
