import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getActivityHostLink } from "../utils/activityHostLink";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { ActivityHostLink } = await import("./ActivityHostLink");

test("host links keep a real browser fallback, source attribution and single-line labels", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const link = getActivityHostLink({
      url: "https://docs.google.com/forms/d/e/example/viewform",
      label: "SUPPLEMENTARY_FORM",
      locale,
    });
    assert.ok(link);
    const html = renderToStaticMarkup(
      React.createElement(ActivityHostLink, {
        link,
        locale,
        event: {
          name: "ticket_link_clicked",
          entityId: "example",
          entityType: "activity",
          sourceSurface: "activity_detail",
        },
      }),
    );
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /docs\.google\.com/);
    assert.match(html, /truncate whitespace-nowrap/);
    assert.doesNotMatch(html, /<form|<button|type="submit"/);
    assert.match(html, /min-h-11/);
  }
});
