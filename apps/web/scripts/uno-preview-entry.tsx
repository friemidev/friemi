import { createRoot } from "react-dom/client";
import { UnoPreview } from "../features/game-tools/components/UnoPreview";
import { isUnoPreviewScenario } from "../features/game-tools/unoPreviewScenarios";

const query = new URLSearchParams(window.location.search);
const locale = query.get("locale") ?? window.location.pathname.match(/^\/(zh-CN|en|fr)\//)?.[1] ?? "zh-CN";
const requestedScene = query.get("scene");
const scene = requestedScene === "entry" || requestedScene === "lobby" || requestedScene === "table" ? requestedScene : /\/(rooms|join)\//.test(window.location.pathname) ? "lobby" : /\/uno$/.test(window.location.pathname) || /\/game-tools\/?$/.test(window.location.pathname) ? "entry" : "table";
document.documentElement.lang = locale;
const requestedScenario = query.get("scenario");
const scenario = isUnoPreviewScenario(requestedScenario) ? requestedScenario : undefined;
createRoot(document.getElementById("uno-preview-root")!).render(<UnoPreview locale={locale} initialScene={scene} autoplay={query.get("autoplay") !== "0"} playerCount={Number(query.get("count") ?? 4)} scenario={scenario}/>);
