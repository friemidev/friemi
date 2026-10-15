export function getAppLinkCopy(locale: string) {
  if (locale === "fr")
    return {
      title: "Continuer avec Friemi",
      open: "Ouvrir Friemi",
      browser: "Continuer sur le site",
      back: "Retour",
      copy: "Copier le lien",
      copied: "Lien copié",
      copyError: "Copiez ce lien dans votre navigateur :",
      retry: "Réessayer",
      installHint:
        "Après l’installation, revenez à ce lien pour retrouver cette page.",
      wechatTitle: "Ouvrir dans le navigateur",
      wechatBrowserHint:
        "Dans WeChat, touchez ··· puis « Ouvrir dans le navigateur » pour continuer la connexion sur le site.",
      wechatHint:
        "Dans WeChat, touchez ··· puis « Ouvrir dans le navigateur ». Vous pourrez ouvrir Friemi ou l’installer.",
      notOpened: "L’app ne s’est pas ouverte ? Installez Friemi ou réessayez.",
    };
  if (locale === "en")
    return {
      title: "Continue with Friemi",
      open: "Open Friemi",
      browser: "Continue on the web",
      back: "Back",
      copy: "Copy link",
      copied: "Link copied",
      copyError: "Copy this link into your browser:",
      retry: "Try again",
      installHint: "After installing, return to this link to open this page.",
      wechatTitle: "Open in your browser",
      wechatBrowserHint:
        "In WeChat, tap ··· then “Open in browser” to continue signing in on the website.",
      wechatHint:
        "In WeChat, tap ··· then “Open in browser”. You can then open Friemi or install it.",
      notOpened: "App didn’t open? Install Friemi or try again.",
    };
  return {
    title: "在 Friemi 继续",
    open: "打开 Friemi",
    browser: "继续使用网页版",
    back: "返回",
    copy: "复制链接",
    copied: "链接已复制",
    copyError: "请复制此链接到浏览器：",
    retry: "再次打开",
    installHint: "安装后回到这个链接，即可打开原页面。",
    wechatTitle: "在浏览器中打开",
    wechatBrowserHint:
      "点击微信右上角 ···，选择「在浏览器中打开」，继续在网页上登录。",
    wechatHint:
      "点击微信右上角 ···，选择「在浏览器中打开」，即可打开 Friemi 或下载安装。",
    notOpened: "App 没有打开？可以下载安装，或再次尝试。",
  };
}
