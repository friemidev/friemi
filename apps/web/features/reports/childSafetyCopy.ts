export const childSafetyContactEmail = "friemi.dev@gmail.com";

const childSafetyCopy = {
  "zh-CN": {
    feedback: "反馈与儿童安全",
    standards: "儿童安全标准",
    contact: "儿童安全联系人：Friemi 团队",
    reporting:
      "发现疑似问题时，请在应用内打开“我的 → 设置 → 反馈与儿童安全”，选择“儿童安全”，提供相关用户、页面和发生时间。也可在用户资料、私聊菜单或内容上的“举报”入口选择安全风险。无需离开应用即可提交。请勿下载、上传或转发疑似 CSAM；用文字描述及应用内位置帮助定位即可。",
    general: "一般问题",
    child: "儿童安全",
    topic: "反馈类型",
    hint: "可反馈儿童安全、骚扰或其他问题。请提供用户或内容位置，不要上传或转发疑似儿童性虐待材料。",
  },
  en: {
    feedback: "Feedback & child safety",
    standards: "Child safety standards",
    contact: "Child safety contact: Friemi team",
    reporting:
      "To report a concern without leaving the app, open Profile > Settings > Feedback & child safety and select Child safety. Include the relevant user, in-app location and time. You can also use Report on profiles, in the direct-chat menu or on content, and select the safety concern reason. Do not download, upload or forward suspected CSAM; describe the concern and its in-app location in text.",
    general: "General issue",
    child: "Child safety",
    topic: "Feedback type",
    hint: "Report child safety, harassment or other concerns. Include the user or content location; do not upload or forward suspected child sexual abuse material.",
  },
  fr: {
    feedback: "Aide et sécurité des enfants",
    standards: "Normes de sécurité des enfants",
    contact: "Contact pour la sécurité des enfants : équipe Friemi",
    reporting:
      "Sans quitter l'application, ouvrez Profil > Paramètres > Aide et sécurité des enfants, puis choisissez Sécurité des enfants. Indiquez l'utilisateur, l'emplacement dans l'application et la date concernés. Vous pouvez aussi utiliser Signaler sur un profil, dans le menu d'une conversation privée ou sur un contenu, puis choisir le risque de sécurité. Ne téléchargez, ne joignez et ne transférez pas de CSAM présumé ; décrivez le problème et son emplacement par écrit.",
    general: "Problème général",
    child: "Sécurité des enfants",
    topic: "Type de retour",
    hint: "Signalez un risque pour un enfant, du harcèlement ou un autre problème. Indiquez l'utilisateur ou l'emplacement du contenu, sans joindre ni transférer de CSAM présumé.",
  },
};

export function getChildSafetyCopy(locale: string) {
  return (
    childSafetyCopy[locale as keyof typeof childSafetyCopy] ??
    childSafetyCopy["zh-CN"]
  );
}
