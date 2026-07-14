import Link from "next/link";
import type { Metadata } from "next";
import { FileWarning, Mail, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { withLocale } from "@/lib/routes";

type SafetyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type SafetyCopy = {
  title: string;
  eyebrow: string;
  description: string;
  updatedAt: string;
  backHome: string;
  contactLabel: string;
  contactEmail: string;
  privacyLabel: string;
  sections: {
    title: string;
    body: string[];
  }[];
};

const safetyCopy: Record<string, SafetyCopy> = {
  "zh-CN": {
    title: "Friemi 社区安全与内容治理",
    eyebrow: "社区安全",
    description:
      "Friemi 支持用户创建活动、组局、评论、消息和个人资料内容。我们希望大家在真实、友好和可线下见面的前提下使用产品，因此会对举报和安全问题进行人工复核与处理。",
    updatedAt: "最后更新：2026-07-08",
    backHome: "返回首页",
    contactLabel: "安全与举报联系邮箱",
    contactEmail: "friemi.dev@gmail.com",
    privacyLabel: "隐私政策",
    sections: [
      {
        title: "适用范围",
        body: [
          "本页适用于 Friemi 内的公开活动、组局、评论、个人资料、消息及其他用户生成内容。",
          "只要内容或行为会影响活动体验、报名安全、沟通秩序或线下见面风险，都属于 Friemi 的安全治理范围。",
        ],
      },
      {
        title: "不允许的内容与行为",
        body: [
          "垃圾信息、批量引流、重复刷屏、虚假报名或明显误导信息。",
          "骚扰、辱骂、歧视、威胁、恶意挑衅或持续对他人造成不适的行为。",
          "虚构活动、伪造地点/费用/主办身份、诱导站外转账或其他存在安全风险的内容。",
          "色情、暴力、违法交易、仇恨言论，或任何违反当地法律法规的内容。",
          "未经同意公开他人手机号、微信号、住址、证件信息等敏感隐私。",
        ],
      },
      {
        title: "用户如何举报",
        body: [
          "登录后，用户可以在个人资料页、活动详情页、组局详情页和评论区域使用“举报”入口提交反馈。",
          "举报原因目前包括垃圾信息、骚扰或攻击、不适当内容、虚假或误导信息、安全风险以及其他问题。",
          "提交举报时可补充说明，帮助我们更快判断问题；请不要在举报内容里填写新的敏感隐私信息。",
        ],
      },
      {
        title: "我们如何处理举报",
        body: [
          "举报会进入 Friemi 管理后台，由管理员查看举报对象、举报原因、补充说明和提交时间，并记录处理状态。",
          "当前处理状态包括：待处理、处理中、已处理、已驳回。必要时我们会继续人工跟进、联系相关方或保留处理记录。",
          "对于明显违规、误导或存在安全风险的内容，我们会结合上下文做人工判断，并采取相应后续措施。",
        ],
      },
      {
        title: "账号与记录说明",
        body: [
          "账号删除不会自动抹除所有历史活动、报名、消息或举报记录。出于安全、反滥用、纠纷处理和法律合规需要，部分记录可能保留必要信息或做匿名化处理。",
          "Friemi 当前优先提供举报与人工复核闭环。随着移动端能力完善，我们会继续补充更细的用户侧安全工具。",
        ],
      },
    ],
  },
  en: {
    title: "Friemi Community Safety and Moderation",
    eyebrow: "Community safety",
    description:
      "Friemi lets users create activities, group plans, comments, messages, and profile content. We review reports and safety issues to keep the product trustworthy for real-world social plans.",
    updatedAt: "Last updated: 2026-07-08",
    backHome: "Back home",
    contactLabel: "Safety and reporting contact",
    contactEmail: "friemi.dev@gmail.com",
    privacyLabel: "Privacy Policy",
    sections: [
      {
        title: "Scope",
        body: [
          "This page applies to public activities, group plans, comments, profiles, messages, and other user-generated content inside Friemi.",
          "If content or behavior affects trust, signup safety, conversation quality, or in-person meetup safety, it falls within Friemi moderation scope.",
        ],
      },
      {
        title: "Content and behavior that are not allowed",
        body: [
          "Spam, repetitive promotion, fake signups, or clearly misleading information.",
          "Harassment, abuse, discrimination, threats, or behavior that repeatedly makes others feel unsafe.",
          "Fake activities, false venue or price claims, off-platform payment scams, or other unsafe arrangements.",
          "Sexual, violent, illegal, hateful, or otherwise unlawful content.",
          "Sharing someone else's phone number, address, ID details, or other sensitive personal data without permission.",
        ],
      },
      {
        title: "How users can report",
        body: [
          "After signing in, users can report profiles, activity details, group plans, and comments through in-product report entry points.",
          "Current report reasons include spam, harassment, inappropriate content, misleading information, safety concerns, and other issues.",
          "Users may add context when reporting. Please do not include new sensitive personal data in report descriptions.",
        ],
      },
      {
        title: "How reports are handled",
        body: [
          "Reports enter the Friemi admin review queue, where admins can review the target, reason, description, and submission time, then record the review status.",
          "Current statuses are pending, reviewing, resolved, and dismissed. Friemi may continue with manual follow-up when needed.",
          "For clearly unsafe or misleading situations, admins review the surrounding context and decide the next handling step.",
        ],
      },
      {
        title: "Accounts and records",
        body: [
          "Account deletion does not automatically erase every historical activity, signup, message, or report record. Some information may be retained or anonymized for safety, anti-abuse, disputes, or legal compliance.",
          "Friemi currently focuses on a report-and-review moderation loop and will continue expanding user-facing safety tools over time.",
        ],
      },
    ],
  },
  fr: {
    title: "Securite et moderation de la communaute Friemi",
    eyebrow: "Securite communautaire",
    description:
      "Friemi permet de creer des activites, groupes, commentaires, messages et profils. Nous examinons les signalements et les questions de securite pour garder une experience fiable autour des rencontres reelles.",
    updatedAt: "Derniere mise a jour : 2026-07-08",
    backHome: "Retour a l'accueil",
    contactLabel: "Contact securite et signalement",
    contactEmail: "friemi.dev@gmail.com",
    privacyLabel: "Politique de confidentialite",
    sections: [
      {
        title: "Perimetre",
        body: [
          "Cette page couvre les activites publiques, groupes, commentaires, profils, messages et autres contenus generes par les utilisateurs dans Friemi.",
          "Si un contenu ou un comportement affecte la confiance, la securite des inscriptions, la qualite des echanges ou les rencontres hors ligne, il entre dans le champ de moderation de Friemi.",
        ],
      },
      {
        title: "Contenus et comportements interdits",
        body: [
          "Spam, promotion repetitive, fausses inscriptions ou informations clairement trompeuses.",
          "Harcelement, insultes, discrimination, menaces ou comportement rendant les autres mal a l'aise de facon repetee.",
          "Fausses activites, faux lieux, faux prix, paiements frauduleux hors plateforme ou autres situations dangereuses.",
          "Contenus sexuels, violents, illegaux, haineux ou contraires a la loi.",
          "Publication sans accord du numero, de l'adresse, des pieces d'identite ou d'autres donnees sensibles d'une autre personne.",
        ],
      },
      {
        title: "Comment signaler",
        body: [
          "Apres connexion, les utilisateurs peuvent signaler des profils, activites, groupes et commentaires via les entrees de signalement integrees.",
          "Les motifs actuels incluent le spam, le harcelement, le contenu inapproprie, les informations trompeuses, les risques de securite et les autres problemes.",
          "Un contexte peut etre ajoute lors du signalement. Merci de ne pas ajouter de nouvelles donnees personnelles sensibles dans cette description.",
        ],
      },
      {
        title: "Traitement des signalements",
        body: [
          "Les signalements entrent dans la file de revue admin Friemi, ou les admins voient la cible, le motif, la description et l'heure d'envoi, puis enregistrent l'etat de traitement.",
          "Les etats actuels sont : a traiter, en cours, traite et rejete. Un suivi manuel peut etre effectue si necessaire.",
          "En cas de risque clair ou de contenu trompeur, les admins examinent le contexte avant de decider de la suite.",
        ],
      },
      {
        title: "Comptes et conservation",
        body: [
          "La suppression du compte n'efface pas automatiquement tout l'historique d'activites, d'inscriptions, de messages ou de signalements. Certaines donnees peuvent etre conservees ou anonymisees pour la securite, l'anti-abus, les litiges ou la conformite.",
          "Friemi repose actuellement surtout sur une boucle signalement + revue manuelle, et continuera d'ajouter des outils de securite cote utilisateur.",
        ],
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: SafetyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = safetyCopy[locale] ?? safetyCopy["zh-CN"];

  return {
    description: copy.description,
    title: copy.title,
  };
}

export default async function SafetyPage({ params }: SafetyPageProps) {
  const { locale } = await params;
  const copy = safetyCopy[locale] ?? safetyCopy["zh-CN"];

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
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              className="inline-flex min-w-0 items-center gap-2 rounded-full bg-[#156240] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D1D1B]"
              href={`mailto:${copy.contactEmail}`}
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-all">{copy.contactEmail}</span>
            </a>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-4 py-2 text-sm font-semibold text-[#156240] transition hover:border-[#8AB68E] hover:bg-white"
              href={withLocale(locale, "/privacy")}
            >
              <FileWarning className="h-4 w-4" aria-hidden="true" />
              {copy.privacyLabel}
            </Link>
          </div>
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
