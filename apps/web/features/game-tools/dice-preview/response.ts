import { readFile } from "node:fs/promises";
import path from "node:path";

const copy = {
  "zh-CN": {
    title: "摇骰子",
    comingSoon: "敬请期待",
    back: "返回游戏房间",
    preview: "试玩版",
    practice: "本机练习 · 3位电脑",
    online: "和朋友玩",
    exitTitle: "退出练习？",
    exitDescription: "本局与练习分数将清空。",
    stay: "继续玩",
    leave: "退出",
  },
  en: {
    title: "Dice",
    comingSoon: "Coming soon",
    back: "Back to game rooms",
    preview: "Preview",
    practice: "Local practice · 3 bots",
    online: "Play with friends",
    exitTitle: "Leave practice?",
    exitDescription: "This round and your practice scores will be cleared.",
    stay: "Keep playing",
    leave: "Leave",
  },
  fr: {
    title: "Dés",
    comingSoon: "Bientôt disponible",
    back: "Retour aux salons de jeu",
    preview: "Aperçu",
    practice: "Entraînement local · 3 robots",
    online: "Jouer entre amis",
    exitTitle: "Quitter l’entraînement ?",
    exitDescription: "Cette manche et les scores d’entraînement seront effacés.",
    stay: "Continuer",
    leave: "Quitter",
  },
} as const;

const assetTypes = new Map<string, string>([
  ["style.css", "text/css; charset=utf-8"],
  ["dice-sprites.css", "text/css; charset=utf-8"],
  ["app.js", "text/javascript; charset=utf-8"],
  ["dice-sprites.js", "text/javascript; charset=utf-8"],
  ["bluff-engine.js", "text/javascript; charset=utf-8"],
]);

for (let face = 1; face <= 6; face += 1) {
  assetTypes.set(`assets/dice-3d/roll-${face}.webp`, "image/webp");
}
for (const mood of ["idle", "thinking", "happy", "sad"]) {
  assetTypes.set(`assets/cats/cloud-${mood}.svg`, "image/svg+xml");
  for (const cat of ["baker", "scholar", "captain", "cloud"]) {
    assetTypes.set(`assets/cats/players/${cat}-${mood}.svg`, "image/svg+xml");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

async function readRuntimeFile(filename: string): Promise<Buffer> {
  const relativeRoot = "features/game-tools/dice-preview/runtime";
  // Next runs from apps/web; the fallback also supports repository-root scripts.
  try {
    return await readFile(path.join(process.cwd(), relativeRoot, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return readFile(path.join(process.cwd(), "apps/web", relativeRoot, filename));
  }
}

function response(body: BodyInit, type: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": type,
      // Recheck availability on every request, including after a deployment change.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function notFound(): Response {
  return response("Not found", "text/plain; charset=utf-8", 404);
}

function comingSoon(locale: keyof typeof copy): string {
  const text = copy[locale];
  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="theme-color" content="#FFFCF5" />
  <title>${text.title} · Friemi</title>
  <link rel="icon" type="image/webp" href="/game-tools/dice/logo.webp" />
  <style>
    *{box-sizing:border-box}body{margin:0;background:#FFFCF5;color:#30425C;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
    main{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:calc(32px + env(safe-area-inset-top)) 24px calc(32px + env(safe-area-inset-bottom));text-align:center}
    img{display:block;width:min(100%,360px);height:auto}h1{margin:0;font-size:clamp(24px,5vw,32px);font-weight:800}
    a{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:1px solid #B6D3EB;border-radius:16px;background:#DCECF9;color:#30425C;font-weight:700;text-decoration:none;touch-action:manipulation}
    a:focus-visible{outline:3px solid #3C73B0;outline-offset:4px}a:active{transform:translateY(1px)}
  </style>
</head>
<body><main><img src="/game-tools/dice/logo.webp" alt="${text.title}" width="1254" height="1254" /><h1>${text.comingSoon}</h1><a href="/${locale}/game-tools">${text.back}</a></main></body>
</html>`;
}

/** The caller supplies the server's environment decision, never a URL/client flag. */
export async function createDicePreviewResponse(
  locale: string,
  segments: readonly string[] | undefined,
  enabled: boolean,
): Promise<Response> {
  if (!Object.hasOwn(copy, locale)) return notFound();
  const selectedLocale = locale as keyof typeof copy;
  const filename = segments?.join("/") || "index.html";
  const isEntry = filename === "index.html";
  if (!isEntry && (!enabled || !assetTypes.has(filename))) return notFound();

  if (!enabled) {
    return response(comingSoon(selectedLocale), "text/html; charset=utf-8");
  }

  if (isEntry) {
    const text = copy[selectedLocale];
    const replacements: Record<string, string> = {
      __DICE_BASE_HREF__: `/${locale}/game-tools/dice/`,
      __DICE_HUB_HREF__: `/${locale}/game-tools`,
      __DICE_ONLINE_HREF__: `/${locale}/game-tools/dice/online`,
      __DICE_ONLINE_LABEL__: text.online,
      __DICE_LOCALE__: locale,
      __DICE_BACK_LABEL__: text.back,
      __DICE_PREVIEW_LABEL__: text.preview,
      __DICE_PRACTICE_LABEL__: text.practice,
      __DICE_EXIT_TITLE__: text.exitTitle,
      __DICE_EXIT_DESCRIPTION__: text.exitDescription,
      __DICE_STAY_LABEL__: text.stay,
      __DICE_LEAVE_LABEL__: text.leave,
    };
    const html = (await readRuntimeFile("index.html"))
      .toString("utf8")
      .replace(/__DICE_[A-Z_]+__/g, (token) => escapeHtml(replacements[token]));
    return response(html, "text/html; charset=utf-8");
  }

  const data = await readRuntimeFile(filename);
  return response(new Uint8Array(data), assetTypes.get(filename)!);
}
