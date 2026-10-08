import Link from "next/link";
import React from "react";
import type { Metadata } from "next";
import {
  ArrowLeft,
  FileWarning,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import {
  childSafetyContactEmail,
  getChildSafetyCopy,
} from "@/features/reports/childSafetyCopy";
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
    id?: string;
    title: string;
    body: string[];
  }[];
};

const safetyCopy: Record<string, SafetyCopy> = {
  "zh-CN": {
    title: "Friemi 儿童安全与社区准则",
    eyebrow: "儿童与社区安全",
    description:
      "Friemi 支持用户创建活动、组局、评论、消息和个人资料内容。我们希望大家在真实、友好和可线下见面的前提下使用产品，因此会对举报和安全问题进行人工复核与处理。",
    updatedAt: "最后更新：2026-10-08",
    backHome: "返回首页",
    contactLabel: "儿童安全与社区举报联系邮箱",
    contactEmail: childSafetyContactEmail,
    privacyLabel: "隐私政策",
    sections: [
      {
        id: "child-safety",
        title: "儿童安全标准：明确禁止 CSAE 和 CSAM",
        body: [
          "Friemi（开发者：Haotian XUE）严格禁止任何形式的儿童性虐待与性剥削（Child Sexual Abuse and Exploitation，CSAE），以及创建、上传、发布、传播、分享或索取儿童性虐待材料（Child Sexual Abuse Material，CSAM）。本标准中的儿童指未满 18 周岁的人。",
          "禁止以性目的诱骗或接近儿童、对儿童实施性勒索、儿童性交易或贩运，以及促进、协助或鼓励这些行为的任何内容。",
          "本标准适用于 Friemi 中的活动、组局、个人资料、评论、消息、图片及其他内容和互动，无论内容是公开还是私密。",
        ],
      },
      {
        id: "child-safety-reporting",
        title: "如何举报儿童安全问题",
        body: [
          getChildSafetyCopy("zh-CN").reporting,
          "也可联系儿童安全与社区举报邮箱 friemi.dev@gmail.com。请提供相关用户、内容或活动的标识及简要说明；请勿下载、附加或转发疑似 CSAM，也不要提交无关的个人隐私信息。",
          "如儿童正面临紧急危险，请立即联系当地紧急服务或执法机构。",
        ],
      },
      {
        id: "child-safety-response",
        title: "审查、处置与向主管机构报告",
        body: [
          "Friemi 由负责儿童安全的管理员优先审查此类举报。获知服务中存在 CSAM 后，我们将及时移除相关内容或停止其访问，并视违规情况限制、停用或删除相关账号。",
          "我们遵守适用的儿童安全法律法规，并按适用要求向美国国家失踪与受虐儿童中心（NCMEC）或相关地区主管机构报告已确认的 CSAM；只按法律要求保留和提供必要信息，限制其访问。",
          "儿童安全联系人通过 friemi.dev@gmail.com 接收举报和询问，并负责协调审查、处置及主管机构报告。我们会根据产品与法律要求的变化更新本标准。",
        ],
      },
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
    title: "Friemi Child Safety and Community Standards",
    eyebrow: "Community safety",
    description:
      "Friemi lets users create activities, group plans, comments, messages, and profile content. We review reports and safety issues to keep the product trustworthy for real-world social plans.",
    updatedAt: "Last updated: 2026-10-08",
    backHome: "Back home",
    contactLabel: "Child safety and community reporting contact",
    contactEmail: childSafetyContactEmail,
    privacyLabel: "Privacy Policy",
    sections: [
      {
        id: "child-safety",
        title: "Child Safety Standards: CSAE and CSAM are prohibited",
        body: [
          "Friemi, published by Haotian XUE, strictly prohibits all forms of Child Sexual Abuse and Exploitation (CSAE), and the creation, upload, publication, distribution, sharing or solicitation of Child Sexual Abuse Material (CSAM). For these standards, a child is anyone under 18.",
          "Prohibited behavior includes grooming a child for sexual purposes, sexual extortion of a child, child sex trafficking, and any content or conduct that facilitates or encourages these acts.",
          "These standards apply to activities, group plans, profiles, comments, messages, images and all other content and interactions on Friemi, whether public or private.",
        ],
      },
      {
        id: "child-safety-reporting",
        title: "Reporting a child safety concern",
        body: [
          getChildSafetyCopy("en").reporting,
          "You can also contact our child safety and community reporting address at friemi.dev@gmail.com. Include the relevant account, content or activity identifier and a brief description. Do not download, attach or forward suspected CSAM or share unrelated personal information.",
          "If a child is in immediate danger, contact local emergency services or law enforcement immediately.",
        ],
      },
      {
        id: "child-safety-response",
        title: "Review, enforcement and reporting to authorities",
        body: [
          "Friemi administrators responsible for child safety prioritize these reports. When we become aware of CSAM on our service, we promptly remove it or disable access and take appropriate account measures, including restriction, suspension or removal.",
          "We comply with applicable child safety laws and report confirmed CSAM to the National Center for Missing & Exploited Children (NCMEC) or the relevant regional authority as required. Necessary information is retained and disclosed only as required by law, with access restricted.",
          "Our child safety contact receives reports and questions at friemi.dev@gmail.com and coordinates review, enforcement and reports to authorities. We update these standards when our product or applicable requirements change.",
        ],
      },
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
    title: "Protection des enfants et règles communautaires — Friemi",
    eyebrow: "Sécurité des enfants et de la communauté",
    description:
      "Friemi permet de créer des activités, des sorties, des commentaires, des messages et des profils. Nous examinons les signalements et les questions de sécurité pour protéger les utilisateurs lors des échanges et des rencontres.",
    updatedAt: "Dernière mise à jour : 2026-10-08",
    backHome: "Retour à l’accueil",
    contactLabel: "Contact pour la sécurité des enfants et les signalements",
    contactEmail: childSafetyContactEmail,
    privacyLabel: "Politique de confidentialité",
    sections: [
      {
        id: "child-safety",
        title: "Protection des enfants : interdiction des CSAE et CSAM",
        body: [
          "Friemi, publié par Haotian XUE, interdit strictement toute forme d’abus et d’exploitation sexuels des enfants (Child Sexual Abuse and Exploitation, CSAE), ainsi que la création, la publication, la diffusion, le partage ou la sollicitation de contenus d’abus sexuels sur enfants (Child Sexual Abuse Material, CSAM). Ces règles considèrent comme enfant toute personne de moins de 18 ans.",
          "Sont notamment interdits la sollicitation de mineurs à des fins sexuelles, le chantage sexuel visant un enfant, la traite d’enfants à des fins sexuelles et tout contenu ou comportement facilitant ou encourageant ces actes.",
          "Ces règles s’appliquent aux activités, sorties, profils, commentaires, messages, images et à tous les autres contenus et interactions sur Friemi, publics comme privés.",
        ],
      },
      {
        id: "child-safety-reporting",
        title: "Signaler un problème de sécurité concernant un enfant",
        body: [
          getChildSafetyCopy("fr").reporting,
          "Vous pouvez également écrire à notre contact pour la sécurité des enfants et les signalements : friemi.dev@gmail.com. Indiquez le compte, le contenu ou l’activité concernés et décrivez brièvement le problème. Ne téléchargez, ne joignez et ne retransmettez pas de contenus soupçonnés d’être des CSAM, ni de données personnelles sans rapport avec le signalement.",
          "Si un enfant est en danger immédiat, contactez les services d’urgence ou les forces de l’ordre de votre pays.",
        ],
      },
      {
        id: "child-safety-response",
        title: "Examen, mesures et signalement aux autorités",
        body: [
          "Les administrateurs de Friemi responsables de la sécurité des enfants examinent ces signalements en priorité. Lorsque nous avons connaissance de CSAM sur notre service, nous les retirons rapidement ou en désactivons l’accès et prenons les mesures appropriées, pouvant inclure la restriction, la suspension ou la suppression des comptes concernés.",
          "Nous respectons les lois applicables en matière de protection des enfants et signalons les cas confirmés de CSAM au National Center for Missing & Exploited Children (NCMEC) ou à l’autorité régionale compétente, conformément aux obligations applicables. Les informations nécessaires sont conservées et transmises uniquement selon les exigences légales, avec un accès restreint.",
          "Notre contact pour la sécurité des enfants reçoit les signalements et les questions à friemi.dev@gmail.com et coordonne leur examen, les mesures prises et les signalements aux autorités. Nous actualisons ces règles en fonction de l’évolution du service et des exigences applicables.",
        ],
      },
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
  const childSafety = getChildSafetyCopy(locale);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-[calc(var(--app-top-safe-area)+1rem)] sm:px-6 sm:pb-12 sm:pt-[calc(var(--app-top-safe-area)+3rem)] md:pt-12 lg:px-8">
        <header className="rounded-3xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_24px_70px_rgba(21,98,64,0.08)] sm:p-8">
          <Link
            aria-label={copy.backHome}
            className="grid h-11 w-11 place-items-center rounded-full bg-fog text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, "/home")}
            title={copy.backHome}
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#8AB68E] bg-[#FEFFF9] px-3 py-1 text-xs font-semibold uppercase tracking-normal text-[#156240]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#1D1D1B] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#156240]">
            {copy.description}
          </p>
          <p className="mt-6 text-sm text-zinc-600">{copy.updatedAt}</p>
        </header>

        <section className="mt-6 rounded-3xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_18px_48px_rgba(21,98,64,0.06)] sm:p-8">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">
            {copy.contactLabel}
          </h2>
          <p className="mt-2 text-sm text-ink/80">{childSafety.contact}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white"
              href={withLocale(locale, "/account/settings#feedback")}
            >
              <MessageSquareText
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {childSafety.feedback}
            </Link>
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
              id={section.id}
              className="scroll-mt-24 rounded-3xl border border-[#D6D5B2] bg-white/85 p-5 shadow-[0_18px_48px_rgba(21,98,64,0.05)] sm:p-8"
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
