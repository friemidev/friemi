import { createRoot } from "react-dom/client";
import { DoudizhuPreview } from "../features/game-tools/components/DoudizhuPreview";
import { createDdzDeck } from "../features/game-tools/doudizhuEngine";
const query = new URLSearchParams(window.location.search);
const locale =
  query.get("locale") ??
  window.location.pathname.match(/^\/(zh-CN|en|fr)\//)?.[1] ??
  "zh-CN";
const requested = query.get("scene");
const scene =
  requested === "entry" || requested === "lobby" ? requested : "table";
// Deterministic local hands exercise the real bidding and play flow. The production
// room client cannot load these fixtures and no event is synthesized for an effect.
const effectHands: Record<string, string[]> = {
  straight: ["c3", "c4", "c5", "c6", "c7"],
  pairs: ["c3", "d3", "c4", "d4", "c5", "d5"],
  airplane: ["c3", "d3", "h3", "c4", "d4", "h4"],
  "airplane-single": ["c3", "d3", "h3", "c4", "d4", "h4", "c7", "c8"],
  "airplane-pair": ["c3", "d3", "h3", "c4", "d4", "h4", "c7", "d7", "c8", "d8"],
  rocket: ["joker-small", "joker-big"],
  bomb: ["c3", "d3", "h3", "s3"],
};
const fixture = effectHands[query.get("effect") ?? ""];
const initialDeck = fixture
  ? [
      ...fixture,
      ...createDdzDeck()
        .map((card) => card.id)
        .filter((id) => !fixture.includes(id)),
    ]
  : undefined;
document.documentElement.lang = locale;
createRoot(document.getElementById("doudizhu-preview-root")!).render(
  <DoudizhuPreview
    locale={locale}
    initialScene={scene}
    initialDeck={initialDeck}
    freezeClock={query.get("clock") === "frozen"}
  />,
);
