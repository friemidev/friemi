import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@prisma/client";
import type { AppLocale } from "@/lib/copy";

const reportCopy = {
  "zh-CN": {
    trigger: "举报",
    signInTrigger: "登录后举报",
    title: "举报内容",
    description: "告诉我们哪里不合适，我们会尽快查看。",
    reasonLabel: "原因",
    descriptionLabel: "补充说明",
    descriptionPlaceholder: "可选，简单说明发生了什么",
    descriptionHint: "请不要填写手机号、地址等隐私信息。",
    submit: "提交举报",
    submitting: "提交中...",
    cancel: "取消",
    successTitle: "已收到举报",
    successDescription: "管理员会尽快查看。感谢你的反馈。",
    successNote: "你可以关闭窗口，继续浏览活动。",
    close: "关闭",
    duplicate: "你已经举报过这条内容。",
    authError: "请登录后再举报。",
    selfError: "不能举报自己。",
    targetUnavailable: "这个内容不存在，或暂时不能举报。",
    formError: "请检查举报内容后再提交。",
    failedError: "举报提交失败，请稍后再试。",
    targetTypes: {
      USER_PROFILE: "用户",
      PUBLIC_EVENT: "活动信息",
      ACTIVITY: "活动 / 组队",
      COMMENT: "评论",
    },
    reasons: {
      SPAM: "垃圾信息",
      HARASSMENT: "骚扰或攻击",
      INAPPROPRIATE_CONTENT: "不适当内容",
      MISLEADING_INFORMATION: "虚假或误导信息",
      SAFETY_CONCERN: "安全风险",
      OTHER: "其他",
    },
    statuses: {
      PENDING: "待处理",
      REVIEWING: "处理中",
      RESOLVED: "已处理",
      DISMISSED: "已驳回",
    },
    admin: {
      eyebrow: "安全与社区",
      title: "举报处理",
      description: "集中查看用户反馈，确认情况后记录处理结果。",
      emptyTitle: "暂无举报",
      emptyDescription: "新的举报会显示在这里。",
      emptyFilteredTitle: "当前筛选下暂无举报",
      emptyFilteredDescription: "切换状态筛选可以查看其他举报。",
      total: (count: number) => `${count} 条举报`,
      pending: (count: number) => `${count} 条待处理`,
      target: "被举报内容",
      reporter: "举报人",
      reason: "原因",
      status: "处理状态",
      statusFilterLabel: "按处理状态筛选",
      statusFilters: {
        ALL: "全部",
        PENDING: "待处理",
        REVIEWING: "处理中",
        RESOLVED: "已处理",
        DISMISSED: "已驳回",
      },
      submittedAt: "提交时间",
      noteLabel: "处理备注",
      notePlaceholder: "可选，记录处理判断",
      save: "更新状态",
      saving: "更新中...",
      reviewSuccess: "处理状态已更新。",
      reviewFailed: "更新失败，请稍后再试。",
      openTarget: "查看内容",
      openReporter: "查看举报人",
      deletedTarget: "内容已不存在",
      noDescription: "用户未填写补充说明。",
      reviewedBy: (name: string) => `处理人：${name}`,
      analytics: {
        averageReviewTime: "平均处理",
        conversionRate: "转组队率",
        hours: (count: number) => `${count} 小时`,
        lessThanOneHour: "< 1 小时",
        newReports: "新举报",
        noReviewTime: "暂无处理记录",
        noTargetDistribution: "暂无举报分布",
        operationsDescription: (days: number) =>
          `最近 ${days} 天的举报处理和公共活动来源表现。`,
        operationsTitle: "运营概览",
        pendingReports: "待处理",
        publicEventTeams: "转成组队",
        sourceClicks: "来源点击",
        targetDistribution: "举报对象",
      },
    },
  },
  en: {
    trigger: "Report",
    signInTrigger: "Sign in to report",
    title: "Report content",
    description: "Tell us what looks wrong. We will review it soon.",
    reasonLabel: "Reason",
    descriptionLabel: "Details",
    descriptionPlaceholder: "Optional. Briefly describe what happened",
    descriptionHint:
      "Please do not include phone numbers, addresses, or private details.",
    submit: "Submit report",
    submitting: "Submitting...",
    cancel: "Cancel",
    successTitle: "Report received",
    successDescription: "An admin will review it soon. Thanks for the signal.",
    successNote: "You can close this window and keep browsing.",
    close: "Close",
    duplicate: "You already reported this item.",
    authError: "Sign in before reporting.",
    selfError: "You cannot report yourself.",
    targetUnavailable: "This item is unavailable for reporting.",
    formError: "Check the report before submitting.",
    failedError: "Failed to submit the report. Try again later.",
    targetTypes: {
      USER_PROFILE: "User",
      PUBLIC_EVENT: "Activity info",
      ACTIVITY: "Activity / crew",
      COMMENT: "Comment",
    },
    reasons: {
      SPAM: "Spam",
      HARASSMENT: "Harassment",
      INAPPROPRIATE_CONTENT: "Inappropriate content",
      MISLEADING_INFORMATION: "Misleading information",
      SAFETY_CONCERN: "Safety concern",
      OTHER: "Other",
    },
    statuses: {
      PENDING: "Pending",
      REVIEWING: "Reviewing",
      RESOLVED: "Resolved",
      DISMISSED: "Dismissed",
    },
    admin: {
      eyebrow: "Safety and community",
      title: "Report review",
      description: "Review community feedback and record the outcome.",
      emptyTitle: "No reports",
      emptyDescription: "New reports will appear here.",
      emptyFilteredTitle: "No reports in this filter",
      emptyFilteredDescription: "Switch status filters to review other reports.",
      total: (count: number) => `${count} report${count === 1 ? "" : "s"}`,
      pending: (count: number) => `${count} pending`,
      target: "Reported content",
      reporter: "Reporter",
      reason: "Reason",
      status: "Status",
      statusFilterLabel: "Filter by status",
      statusFilters: {
        ALL: "All",
        PENDING: "Pending",
        REVIEWING: "Reviewing",
        RESOLVED: "Resolved",
        DISMISSED: "Dismissed",
      },
      submittedAt: "Submitted",
      noteLabel: "Review note",
      notePlaceholder: "Optional. Record the review decision",
      save: "Update status",
      saving: "Updating...",
      reviewSuccess: "Report status updated.",
      reviewFailed: "Update failed. Try again later.",
      openTarget: "View content",
      openReporter: "View reporter",
      deletedTarget: "Content no longer exists",
      noDescription: "No extra details were provided.",
      reviewedBy: (name: string) => `Reviewed by ${name}`,
      analytics: {
        averageReviewTime: "Avg. review",
        conversionRate: "Team rate",
        hours: (count: number) => `${count}h`,
        lessThanOneHour: "< 1h",
        newReports: "New reports",
        noReviewTime: "No reviewed reports yet",
        noTargetDistribution: "No report distribution yet",
        operationsDescription: (days: number) =>
          `Report handling and public activity source performance from the last ${days} days.`,
        operationsTitle: "Operations overview",
        pendingReports: "Pending",
        publicEventTeams: "New teams",
        sourceClicks: "Source clicks",
        targetDistribution: "Reported content",
      },
    },
  },
  fr: {
    trigger: "Signaler",
    signInTrigger: "Connexion pour signaler",
    title: "Signaler un contenu",
    description: "Dites-nous ce qui pose problème. Nous vérifierons bientôt.",
    reasonLabel: "Motif",
    descriptionLabel: "Détails",
    descriptionPlaceholder: "Facultatif. Décrivez brièvement la situation",
    descriptionHint:
      "N'ajoutez pas de téléphone, d'adresse ou d'informations privées.",
    submit: "Envoyer",
    submitting: "Envoi...",
    cancel: "Annuler",
    successTitle: "Signalement reçu",
    successDescription: "Un admin le vérifiera bientôt. Merci.",
    successNote: "Vous pouvez fermer cette fenêtre et continuer.",
    close: "Fermer",
    duplicate: "Vous avez déjà signalé ce contenu.",
    authError: "Connectez-vous avant de signaler.",
    selfError: "Vous ne pouvez pas vous signaler vous-même.",
    targetUnavailable: "Ce contenu ne peut pas être signalé.",
    formError: "Vérifiez le signalement avant de l'envoyer.",
    failedError: "Échec de l'envoi. Réessayez plus tard.",
    targetTypes: {
      USER_PROFILE: "Utilisateur",
      PUBLIC_EVENT: "Activité",
      ACTIVITY: "Activité / groupe",
      COMMENT: "Commentaire",
    },
    reasons: {
      SPAM: "Spam",
      HARASSMENT: "Harcèlement",
      INAPPROPRIATE_CONTENT: "Contenu inapproprié",
      MISLEADING_INFORMATION: "Information trompeuse",
      SAFETY_CONCERN: "Risque de sécurité",
      OTHER: "Autre",
    },
    statuses: {
      PENDING: "À traiter",
      REVIEWING: "En cours",
      RESOLVED: "Traité",
      DISMISSED: "Rejeté",
    },
    admin: {
      eyebrow: "Sécurité et communauté",
      title: "Traitement des signalements",
      description:
        "Consultez les signalements et notez la décision prise.",
      emptyTitle: "Aucun signalement",
      emptyDescription: "Les nouveaux signalements apparaîtront ici.",
      emptyFilteredTitle: "Aucun signalement pour ce filtre",
      emptyFilteredDescription:
        "Changez de statut pour voir les autres signalements.",
      total: (count: number) => `${count} signalement${count > 1 ? "s" : ""}`,
      pending: (count: number) => `${count} à traiter`,
      target: "Contenu signalé",
      reporter: "Signalé par",
      reason: "Motif",
      status: "Statut",
      statusFilterLabel: "Filtrer par statut",
      statusFilters: {
        ALL: "Tous",
        PENDING: "À traiter",
        REVIEWING: "En cours",
        RESOLVED: "Traité",
        DISMISSED: "Rejeté",
      },
      submittedAt: "Envoyé",
      noteLabel: "Note de traitement",
      notePlaceholder: "Facultatif. Notez la décision",
      save: "Mettre à jour",
      saving: "Mise à jour...",
      reviewSuccess: "Statut mis à jour.",
      reviewFailed: "Échec de mise à jour. Réessayez plus tard.",
      openTarget: "Voir le contenu",
      openReporter: "Voir l'auteur",
      deletedTarget: "Ce contenu n'existe plus",
      noDescription: "Aucun détail supplémentaire.",
      reviewedBy: (name: string) => `Traité par ${name}`,
      analytics: {
        averageReviewTime: "Délai moyen",
        conversionRate: "Taux groupe",
        hours: (count: number) => `${count} h`,
        lessThanOneHour: "< 1 h",
        newReports: "Nouveaux",
        noReviewTime: "Aucun traitement récent",
        noTargetDistribution: "Aucune répartition",
        operationsDescription: (days: number) =>
          `Signalements et sources d'activités des ${days} derniers jours.`,
        operationsTitle: "Aperçu opérationnel",
        pendingReports: "À traiter",
        publicEventTeams: "Groupes créés",
        sourceClicks: "Clics source",
        targetDistribution: "Contenus signalés",
      },
    },
  },
} satisfies Record<
  AppLocale,
  {
    trigger: string;
    signInTrigger: string;
    title: string;
    description: string;
    reasonLabel: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    descriptionHint: string;
    submit: string;
    submitting: string;
    cancel: string;
    successTitle: string;
    successDescription: string;
    successNote: string;
    close: string;
    duplicate: string;
    authError: string;
    selfError: string;
    targetUnavailable: string;
    formError: string;
    failedError: string;
    targetTypes: Record<ReportTargetType, string>;
    reasons: Record<ReportReason, string>;
    statuses: Record<ReportStatus, string>;
    admin: {
      eyebrow: string;
      title: string;
      description: string;
      emptyTitle: string;
      emptyDescription: string;
      emptyFilteredTitle: string;
      emptyFilteredDescription: string;
      total: (count: number) => string;
      pending: (count: number) => string;
      target: string;
      reporter: string;
      reason: string;
      status: string;
      statusFilterLabel: string;
      statusFilters: Record<ReportStatus | "ALL", string>;
      submittedAt: string;
      noteLabel: string;
      notePlaceholder: string;
      save: string;
      saving: string;
      reviewSuccess: string;
      reviewFailed: string;
      openTarget: string;
      openReporter: string;
      deletedTarget: string;
      noDescription: string;
      reviewedBy: (name: string) => string;
      analytics: {
        averageReviewTime: string;
        conversionRate: string;
        hours: (count: number) => string;
        lessThanOneHour: string;
        newReports: string;
        noReviewTime: string;
        noTargetDistribution: string;
        operationsDescription: (days: number) => string;
        operationsTitle: string;
        pendingReports: string;
        publicEventTeams: string;
        sourceClicks: string;
        targetDistribution: string;
      };
    };
  }
>;

export function getReportCopy(locale: string) {
  return reportCopy[locale as AppLocale] ?? reportCopy["zh-CN"];
}
