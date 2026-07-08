import Link from "next/link";
import type { Metadata } from "next";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountDeletionEntryCard } from "@/features/account/components/AccountDeletionEntryCard";
import { AccountContactBindingsSection } from "@/features/account/components/AccountContactBindingsSection";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type AccountSecurityPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const accountSecurityCopy = {
  "zh-CN": {
    metadataTitle: "账号与安全",
    eyebrow: "账号与安全",
    title: "管理你的 Friemi 账号",
    description:
      "查看账号标识、联系方式绑定、隐私入口，并在需要时从 App 内发起账号删除。",
    profileTitle: "当前账号",
    loginEmail: "登录邮箱",
    contactEmail: "联系邮箱",
    friendCode: "好友号",
    missing: "暂未填写",
    privacyLink: "查看隐私政策",
    safetyLink: "查看社区安全说明",
    supportTitle: "需要帮助？",
    supportBody:
      "如果你对账号删除、数据保留或隐私政策有疑问，可以通过邮箱联系我们。",
    supportEmail: "friemi.dev@gmail.com",
    deletion: {
      title: "删除账号",
      body: "删除账号会影响你的个人资料、联系方式、设备 token 和后续登录状态。活动、报名、消息和举报等记录可能因安全、反滥用、纠纷处理或法律合规保留必要信息。",
      openConfirm: "删除账号",
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
    eyebrow: "Account & Security",
    title: "Manage your Friemi account",
    description:
      "Review account identifiers, contact bindings, privacy links, and initiate account deletion from inside the app when needed.",
    profileTitle: "Current account",
    loginEmail: "Login email",
    contactEmail: "Contact email",
    friendCode: "Friend code",
    missing: "Not set",
    privacyLink: "View Privacy Policy",
    safetyLink: "View Community Safety",
    supportTitle: "Need help?",
    supportBody:
      "Contact us by email if you have questions about account deletion, data retention, or the privacy policy.",
    supportEmail: "friemi.dev@gmail.com",
    deletion: {
      title: "Delete account",
      body: "Deleting your account affects your profile, contact bindings, device tokens, and future sign-in state. Some activity, signup, message, and report records may be retained for safety, anti-abuse, dispute handling, or legal compliance.",
      openConfirm: "Delete account",
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
    eyebrow: "Compte et securite",
    title: "Gerer votre compte Friemi",
    description:
      "Consultez les informations du compte, les coordonnees liees, les liens de confidentialite et lancez la suppression du compte depuis l'app si besoin.",
    profileTitle: "Compte actuel",
    loginEmail: "E-mail de connexion",
    contactEmail: "E-mail de contact",
    friendCode: "Code ami",
    missing: "Non renseigne",
    privacyLink: "Voir la politique de confidentialite",
    safetyLink: "Voir la securite communautaire",
    supportTitle: "Besoin d'aide ?",
    supportBody:
      "Contactez-nous par e-mail pour toute question sur la suppression du compte, la conservation des donnees ou la politique de confidentialite.",
    supportEmail: "friemi.dev@gmail.com",
    deletion: {
      title: "Supprimer le compte",
      body: "La suppression du compte affecte le profil, les coordonnees, les tokens d'appareil et les connexions futures. Certains historiques d'activite, d'inscription, de message ou de signalement peuvent etre conserves pour la securite, l'anti-abus, les litiges ou la conformite.",
      openConfirm: "Supprimer le compte",
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
      success: "La soumission nettoie les donnees du compte et vous deconnecte.",
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
  const profile = await ensureCurrentUserProfile(
    locale,
    "/account/security",
  );

  return (
    <PageContainer className="space-y-5 pb-24">
      <header className="rounded-2xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_18px_48px_rgba(21,98,64,0.06)] sm:p-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#FEFFF9] px-3 py-1 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#156240] sm:text-base">
          {copy.description}
        </p>
      </header>

      <section className="rounded-2xl border border-[#D6D5B2] bg-white p-5 shadow-[0_18px_48px_rgba(21,98,64,0.05)] sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <UserRound className="h-5 w-5 text-[#156240]" aria-hidden="true" />
          {copy.profileTitle}
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <AccountField label={copy.loginEmail} value={profile.email} />
          <AccountField
            label={copy.contactEmail}
            value={profile.contactEmail}
          />
          <AccountField label={copy.friendCode} value={profile.friendCode} />
        </dl>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-4 py-2 text-sm font-semibold text-[#156240] transition hover:border-[#8AB68E] hover:bg-white"
            href={withLocale(locale, "/privacy")}
          >
            {copy.privacyLink}
          </Link>
          <Link
            className="inline-flex rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-4 py-2 text-sm font-semibold text-[#156240] transition hover:border-[#8AB68E] hover:bg-white"
            href={withLocale(locale, "/safety")}
          >
            {copy.safetyLink}
          </Link>
        </div>
      </section>

      <AccountContactBindingsSection
        initialContactEmail={profile.contactEmail}
        initialPhone={profile.phone}
        initialWechatId={profile.wechatId}
        loginEmail={profile.email}
        locale={locale}
      />

      <section className="rounded-2xl border border-[#D6D5B2] bg-white p-5 shadow-[0_18px_48px_rgba(21,98,64,0.05)] sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Mail className="h-5 w-5 text-[#F09182]" aria-hidden="true" />
          {copy.supportTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-700">
          {copy.supportBody}
        </p>
        <a
          className="mt-4 inline-flex rounded-full bg-[#156240] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D1D1B]"
          href={`mailto:${copy.supportEmail}`}
        >
          {copy.supportEmail}
        </a>
      </section>

      <AccountDeletionEntryCard copy={copy.deletion} locale={locale} />
    </PageContainer>
  );
}

function AccountField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#FEFFF9] p-4 ring-1 ring-[#D6D5B2]">
      <dt className="text-xs font-semibold text-[#156240]">{label}</dt>
      <dd className="mt-2 min-h-5 truncate text-sm font-medium text-ink">
        {value?.trim() || "-"}
      </dd>
    </div>
  );
}
