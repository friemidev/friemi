import assert from "node:assert/strict";
import test from "node:test";
import { localizeDescriptionText } from "./ActivityRichDescription";

test("localizeDescriptionText localizes imported official link prefixes", () => {
  const text = "活动介绍\n\n官方链接：https://www.paris.fr/events/demo";

  assert.equal(
    localizeDescriptionText(text, "en"),
    "活动介绍\n\nOfficial link: https://www.paris.fr/events/demo",
  );
  assert.equal(
    localizeDescriptionText(text, "fr"),
    "活动介绍\n\nLien officiel: https://www.paris.fr/events/demo",
  );
  assert.equal(
    localizeDescriptionText(text, "zh-CN"),
    "活动介绍\n\n官方链接: https://www.paris.fr/events/demo",
  );
});
