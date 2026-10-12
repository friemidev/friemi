import { createRoot } from "react-dom/client";
import { UnoPreview, type UnoPreviewScenario } from "../features/game-tools/components/UnoPreview";

const query = new URLSearchParams(window.location.search);
const locale = query.get("locale") ?? window.location.pathname.match(/^\/(zh-CN|en|fr)\//)?.[1] ?? "zh-CN";
const requestedScene = query.get("scene");
const scene = requestedScene === "entry" || requestedScene === "lobby" || requestedScene === "table" ? requestedScene : /\/(rooms|join)\//.test(window.location.pathname) ? "lobby" : /\/uno$/.test(window.location.pathname) || /\/game-tools\/?$/.test(window.location.pathname) ? "entry" : "table";
document.documentElement.lang = locale;
const requestedScenario = query.get("scenario");
const scenario = ["one-card", "two-cards", "function-last", "report", "challenge", "result", "many-cards"].includes(requestedScenario ?? "") ? requestedScenario as UnoPreviewScenario : undefined;
createRoot(document.getElementById("uno-preview-root")!).render(<UnoPreview locale={locale} initialScene={scene} autoplay={query.get("autoplay") !== "0"} playerCount={Number(query.get("count") ?? 4)} scenario={scenario}/>);
