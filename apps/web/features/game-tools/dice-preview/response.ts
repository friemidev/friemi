import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildCanonicalSiteUrl } from "@/lib/site-url";
import { diceDeviceCopy } from "../diceDeviceCopy";

const copy = {
  "zh-CN": {
    title: "摇骰子",
    seoTitle: "在线骰子游戏网页版｜自由摇骰、吹牛 · Friemi",
    seoDescription: "在 Friemi 网页版自由选择骰子数量摇一摇，或与朋友进入在线吹牛房间叫点、开盅。无需下载。",
    back: "返回游戏房间",
    preview: "试玩版",
    single: "单人模式",
    online: "多人模式",
    players: "游戏人数",
    exitTitle: "退出练习？",
    exitDescription: "本局与练习分数将清空。",
    stay: "继续玩",
    leave: "退出",
  },
  en: {
    title: "Dice",
    seoTitle: "Online Dice Game for Web | Friemi",
    seoDescription: "Roll your choice of dice in the browser or play Liar’s Dice online with friends on Friemi. No download needed.",
    back: "Back to game rooms",
    preview: "Preview",
    single: "Single player",
    online: "Multiplayer",
    players: "Players",
    exitTitle: "Leave practice?",
    exitDescription: "This round and your practice scores will be cleared.",
    stay: "Keep playing",
    leave: "Leave",
  },
  fr: {
    title: "Dés",
    seoTitle: "Jeu de dés en ligne sur navigateur · Friemi",
    seoDescription: "Lancez le nombre de dés de votre choix sur le web ou jouez au bluff en ligne avec vos amis sur Friemi, sans téléchargement.",
    back: "Retour aux salons de jeu",
    preview: "Aperçu",
    single: "Solo",
    online: "Multijoueur",
    players: "Joueurs",
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
  ["dice-device.js", "text/javascript; charset=utf-8"],
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

function response(body: BodyInit, type: string, status = 200, indexable = false): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": type,
      // Keep environment-specific indexing and availability out of shared caches.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(!indexable ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    },
  });
}

function notFound(): Response {
  return response("Not found", "text/plain; charset=utf-8", 404);
}

/** The caller supplies the server's environment decision, never a URL/client flag. */
export async function createDiceGameResponse(
  locale: string,
  segments: readonly string[] | undefined,
  enabled: boolean,
  production = false,
): Promise<Response> {
  if (!enabled || !Object.hasOwn(copy, locale)) return notFound();
  const selectedLocale = locale as keyof typeof copy;
  const filename = segments?.join("/") || "index.html";
  const isEntry = filename === "index.html";
  if (!isEntry && !assetTypes.has(filename)) return notFound();

  if (isEntry) {
    const text = copy[selectedLocale];
    const device = diceDeviceCopy[selectedLocale];
    const replacements: Record<string, string> = {
      __DICE_BASE_HREF__: `/${locale}/game-tools/dice/`,
      __DICE_HUB_HREF__: `/${locale}/game-tools`,
      __DICE_ONLINE_HREF__: `/${locale}/game-tools/dice/online`,
      __DICE_ONLINE_LABEL__: text.online,
      __DICE_SINGLE_LABEL__: text.single,
      __DICE_PLAYERS_LABEL__: text.players,
      __DICE_GAME_LABEL__: text.title,
      __DICE_LOCALE__: locale,
      __DICE_BACK_LABEL__: text.back,
      __DICE_PREVIEW_LABEL__: production ? "" : text.preview,
      __DICE_CANONICAL_URL__: buildCanonicalSiteUrl(`/${locale}/game-tools/dice`),
      __DICE_ZH_URL__: buildCanonicalSiteUrl("/zh-CN/game-tools/dice"),
      __DICE_EN_URL__: buildCanonicalSiteUrl("/en/game-tools/dice"),
      __DICE_FR_URL__: buildCanonicalSiteUrl("/fr/game-tools/dice"),
      __DICE_IMAGE_URL__: buildCanonicalSiteUrl("/game-tools/dice/logo.webp"),
      __DICE_META_TITLE__: text.seoTitle,
      __DICE_META_DESCRIPTION__: text.seoDescription,
      __DICE_EXIT_TITLE__: text.exitTitle,
      __DICE_EXIT_DESCRIPTION__: text.exitDescription,
      __DICE_STAY_LABEL__: text.stay,
      __DICE_LEAVE_LABEL__: text.leave,
      __DICE_SHAKE_LABEL__: device.shake,
      __DICE_SHAKE_HINT__: device.shakeHint,
      __DICE_MOTION_REQUESTING__: device.requesting,
      __DICE_MOTION_DENIED__: device.denied,
      __DICE_MOTION_UNSUPPORTED__: device.unsupported,
      __DICE_MOTION_UNAVAILABLE__: device.unavailable,
      __DICE_SOUND_ON__: device.soundOn,
      __DICE_SOUND_OFF__: device.soundOff,
      __DICE_SOUND_ERROR__: device.soundError,
    };
    const html = (await readRuntimeFile("index.html"))
      .toString("utf8")
      .replace(/__DICE_[A-Z_]+__/g, (token) => escapeHtml(replacements[token]));
    return response(html, "text/html; charset=utf-8", 200, production);
  }

  const data = await readRuntimeFile(filename);
  return response(new Uint8Array(data), assetTypes.get(filename)!);
}
