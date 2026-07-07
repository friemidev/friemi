import Link from "next/link";
import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { withLocale } from "@/lib/routes";

type PrivacyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type PrivacyCopy = {
  title: string;
  eyebrow: string;
  description: string;
  updatedAt: string;
  contactLabel: string;
  contactEmail: string;
  backHome: string;
  sections: {
    title: string;
    body: string[];
  }[];
};

const privacyCopy: Record<string, PrivacyCopy> = {
  "zh-CN": {
    title: "Friemi 隐私政策",
    eyebrow: "隐私与数据说明",
    description:
      "Friemi 是面向海外中文用户的活动发现与组局工具。我们只在提供账号、活动、报名、消息、通知、安全和支持服务所需的范围内处理数据。",
    updatedAt: "最后更新：2026-07-08",
    contactLabel: "隐私与账号删除联系邮箱",
    contactEmail: "friemi.dev@gmail.com",
    backHome: "返回首页",
    sections: [
      {
        title: "我们收集的信息",
        body: [
          "账号信息：邮箱、昵称、头像、第三方登录标识、Friemi 用户 ID、好友号。",
          "联系方式：用户主动填写的联系邮箱、手机号、微信号等，用于报名联系、账号绑定和活动沟通。",
          "用户生成内容：用户发布或参与的活动、组局标题、描述、时间、地点、费用、封面、报名记录、公告、举报和消息内容。",
          "设备和技术信息：App 版本、平台、语言、时区、user agent、设备标识、推送 token 和最近活跃时间。iOS 推送仅在对应能力上线并获得授权后收集。",
          "图片和文件：用户主动上传的活动封面，以及后续功能中用户主动选择上传的头像或聊天图片。",
          "使用数据：页面浏览、按钮点击、活动详情查看、报名、收藏、搜索、消息和通知等产品分析事件。",
        ],
      },
      {
        title: "我们如何使用这些信息",
        body: [
          "用于创建和管理账号、识别登录用户、展示个人资料和维护账号安全。",
          "用于展示活动和组局、处理报名、管理参与者、发送活动公告、消息和通知。",
          "用于好友、私信、报名审核、举报处理、反滥用、安全风控和客服支持。",
          "用于排查故障、分析产品使用情况、优化活动推荐、页面体验和移动端稳定性。",
        ],
      },
      {
        title: "第三方服务",
        body: [
          "Friemi 使用 Clerk 提供登录和账号认证服务，使用 Supabase / PostgreSQL 提供数据库和存储能力，使用 Vercel 提供网站和 API 托管。",
          "如用户选择 Google OAuth，Google 会参与认证流程。Android 推送会使用 Firebase Cloud Messaging；iOS 推送如上线，将使用 Apple Push Notification service。",
          "这些服务只会在 Friemi 产品运行所需的范围内处理数据。Friemi 不出售用户个人信息，也不将用户数据用于跨 App 或跨网站广告追踪。",
        ],
      },
      {
        title: "权限和设备能力",
        body: [
          "当前 iOS 版本不主动申请相机、定位或相册权限。若未来上线扫码、附近活动、签到校验或原生图片选择能力，我们会在用户触发对应功能时再请求权限，并说明具体用途。",
          "通知权限只会用于报名审核、好友请求、消息和活动更新等 Friemi 相关提醒。用户可以在系统设置中关闭通知。",
        ],
      },
      {
        title: "数据保留、修改和删除",
        body: [
          "用户可以在个人资料中修改昵称、头像和部分联系方式。部分活动、报名、消息和举报记录可能因安全、反滥用、纠纷处理或法律合规需要保留必要记录。",
          "如需删除账号或相关数据，请通过本页邮箱联系我们。我们会验证请求来源，并在合理时间内处理账号停用、联系方式清理、设备 token 禁用和必要数据删除或匿名化。",
        ],
      },
      {
        title: "未成年人和政策更新",
        body: [
          "Friemi 不面向未成年人单独提供服务。如发现未成年人在未获监护人同意的情况下提供个人信息，请联系我们处理。",
          "当产品功能、数据处理方式或第三方服务发生重要变化时，我们会更新本政策，并在页面上标明更新时间。",
        ],
      },
    ],
  },
  en: {
    title: "Friemi Privacy Policy",
    eyebrow: "Privacy and data",
    description:
      "Friemi helps overseas Chinese-speaking users discover activities, start group plans, and communicate around events. We process data only to provide account, event, messaging, notification, safety, analytics, and support features.",
    updatedAt: "Last updated: 2026-07-08",
    contactLabel: "Privacy and account deletion contact",
    contactEmail: "friemi.dev@gmail.com",
    backHome: "Back home",
    sections: [
      {
        title: "Information we collect",
        body: [
          "Account information such as email, nickname, avatar, third-party sign-in identifiers, Friemi user ID, and friend code.",
          "Contact information users provide, including contact email, phone number, or WeChat ID.",
          "User content such as activities, group plans, descriptions, times, locations, fees, cover images, signup records, announcements, reports, and messages.",
          "Device and technical data such as app version, platform, locale, timezone, user agent, device ID, push token, and last seen time when related mobile features are enabled.",
          "Usage analytics such as page views and feature interactions used to improve reliability and product experience.",
        ],
      },
      {
        title: "How we use information",
        body: [
          "To provide authentication, account management, profile display, activities, signups, messages, notifications, friends, reporting, moderation, security, support, troubleshooting, and product analytics.",
          "Friemi does not sell personal information and does not use user data for cross-app or cross-site advertising tracking.",
        ],
      },
      {
        title: "Service providers",
        body: [
          "Friemi uses Clerk for authentication, Supabase / PostgreSQL for database and storage, Vercel for hosting and APIs, Google OAuth when selected by the user, Firebase Cloud Messaging for Android push notifications, and Apple Push Notification service if iOS push is enabled.",
        ],
      },
      {
        title: "Permissions, retention, and deletion",
        body: [
          "The current iOS app does not request camera, location, or photo library permissions unless a related feature is added later and initiated by the user.",
          "Users may update profile information in the app. To request account or data deletion, contact us at the email listed on this page. We will verify the request and handle account deactivation, contact cleanup, device token removal, and deletion or anonymization where appropriate.",
        ],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialite Friemi",
    eyebrow: "Confidentialite et donnees",
    description:
      "Friemi aide les utilisateurs sinophones a l'etranger a decouvrir des activites, creer des sorties et communiquer autour des evenements. Nous traitons les donnees necessaires au compte, aux activites, aux messages, aux notifications, a la securite, a l'analyse et au support.",
    updatedAt: "Derniere mise a jour : 2026-07-08",
    contactLabel: "Contact confidentialite et suppression de compte",
    contactEmail: "friemi.dev@gmail.com",
    backHome: "Retour a l'accueil",
    sections: [
      {
        title: "Informations collectees",
        body: [
          "Informations de compte : e-mail, pseudo, avatar, identifiants de connexion tiers, identifiant Friemi et code ami.",
          "Coordonnees fournies par l'utilisateur : e-mail de contact, telephone ou identifiant WeChat.",
          "Contenu utilisateur : activites, sorties, descriptions, horaires, lieux, frais, images, inscriptions, annonces, signalements et messages.",
          "Donnees techniques : version de l'app, plateforme, langue, fuseau horaire, user agent, identifiant d'appareil, token de notification et derniere activite lorsque ces fonctions sont activees.",
        ],
      },
      {
        title: "Utilisation des donnees",
        body: [
          "Nous utilisons ces informations pour l'authentification, les profils, les activites, les inscriptions, les messages, les notifications, les amis, la moderation, la securite, le support, le diagnostic et l'amelioration du produit.",
          "Friemi ne vend pas les informations personnelles et ne les utilise pas pour du suivi publicitaire entre apps ou sites.",
        ],
      },
      {
        title: "Services tiers",
        body: [
          "Friemi utilise Clerk pour l'authentification, Supabase / PostgreSQL pour la base de donnees et le stockage, Vercel pour l'hebergement et les API, Google OAuth si l'utilisateur le choisit, Firebase Cloud Messaging pour Android et Apple Push Notification service si les notifications iOS sont activees.",
        ],
      },
      {
        title: "Autorisations et suppression",
        body: [
          "La version iOS actuelle ne demande pas l'appareil photo, la localisation ou la phototheque sauf si une fonction correspondante est ajoutee plus tard et declenchee par l'utilisateur.",
          "Pour demander la suppression du compte ou des donnees, contactez-nous a l'adresse indiquee sur cette page. Nous verifierons la demande puis traiterons la desactivation du compte, le nettoyage des coordonnees, la suppression des tokens d'appareil et la suppression ou l'anonymisation lorsque cela est applicable.",
        ],
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = privacyCopy[locale] ?? privacyCopy["zh-CN"];

  return {
    description: copy.description,
    title: copy.title,
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const copy = privacyCopy[locale] ?? privacyCopy["zh-CN"];

  return (
    <main className="min-h-screen bg-[#FEFFF9]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="rounded-3xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_24px_70px_rgba(21,98,64,0.08)] sm:p-8">
          <BrandLockup size="sm" />
          <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#8AB68E] bg-[#FEFFF9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#156240]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#1D1D1B] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#156240]">
            {copy.description}
          </p>
          <div className="mt-6 flex flex-col gap-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>{copy.updatedAt}</p>
            <Link
              className="inline-flex w-fit items-center justify-center rounded-full border border-[#D6D5B2] bg-white px-4 py-2 font-semibold text-[#156240] transition hover:border-[#8AB68E] hover:bg-[#FEFFF9]"
              href={withLocale(locale, "/home")}
            >
              {copy.backHome}
            </Link>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_18px_48px_rgba(21,98,64,0.06)] sm:p-8">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">
            {copy.contactLabel}
          </h2>
          <a
            className="mt-3 inline-flex min-w-0 items-center gap-2 rounded-full bg-[#156240] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D1D1B]"
            href={`mailto:${copy.contactEmail}`}
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-all">{copy.contactEmail}</span>
          </a>
        </section>

        <div className="mt-6 grid gap-4">
          {copy.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_18px_48px_rgba(21,98,64,0.05)] sm:p-8"
            >
              <h2 className="text-xl font-semibold text-[#1D1D1B]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-7 text-zinc-700 sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
