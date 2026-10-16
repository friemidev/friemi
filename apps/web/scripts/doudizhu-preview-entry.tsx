import { createRoot } from "react-dom/client";
import { DoudizhuPreview } from "../features/game-tools/components/DoudizhuPreview";
const query = new URLSearchParams(window.location.search);
const locale = query.get("locale") ?? window.location.pathname.match(/^\/(zh-CN|en|fr)\//)?.[1] ?? "zh-CN";
const requested = query.get("scene");
const scene = requested === "entry" || requested === "lobby" ? requested : "table";
document.documentElement.lang = locale;
createRoot(document.getElementById("doudizhu-preview-root")!).render(<DoudizhuPreview locale={locale} initialScene={scene}/>);
