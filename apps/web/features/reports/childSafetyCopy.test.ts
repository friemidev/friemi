import assert from "node:assert/strict";
import test from "node:test";
import { childSafetyContactEmail, getChildSafetyCopy } from "./childSafetyCopy";
import { getReportCopy } from "./copy";
import { renderToStaticMarkup } from "react-dom/server";
import SafetyPage from "../../app/[locale]/safety/page";

test("every supported locale publishes Friemi's CSAE/CSAM standards and reporting process", async () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const copy = getChildSafetyCopy(locale);
    const text = renderToStaticMarkup(
      await SafetyPage({ params: Promise.resolve({ locale }) }),
    );
    for (const term of ["Friemi", "CSAE", "CSAM", "18", "NCMEC"]) {
      assert.ok(text.includes(term), `${locale}: missing ${term}`);
    }
    assert.ok(copy.contact.includes("Friemi"));
    assert.ok(text.includes('id="child-safety"'));
    assert.ok(text.includes(`/${locale}/account/settings#feedback`));
    assert.ok(getReportCopy(locale).reasons.SAFETY_CONCERN);
  }
  assert.equal(childSafetyContactEmail, "friemi.dev@gmail.com");
});
