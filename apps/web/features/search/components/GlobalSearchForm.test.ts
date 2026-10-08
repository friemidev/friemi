import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { GlobalSearchForm } = await import("./GlobalSearchForm");

test("soft-navigation search retains a localized GET form fallback and keyboard search action", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const html = renderToStaticMarkup(
      React.createElement(GlobalSearchForm, {
        locale,
        defaultQuery: "Paris",
        variant: "page",
      }),
    );
    assert.ok(html.includes(`action="/${locale}/search"`));
    assert.match(html, /name="q"/);
    assert.match(html, /enterKeyHint="search"/);
    assert.match(html, /value="Paris"/);
    assert.doesNotMatch(html, /method="post"/);
  }
});
