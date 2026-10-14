import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../../../packages/ui/src/button";
import { getCopy } from "./copy";

test("shared buttons can shrink inside narrow flex and grid tracks without wrapping", () => {
  const html = renderToStaticMarkup(
    React.createElement(Button, { type: "button", disabled: true }, "Download"),
  );
  assert.match(html, /\bmin-w-0\b/);
  assert.match(html, /\bmax-w-full\b/);
  assert.match(html, /\bwhitespace-nowrap\b/);
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(
    html,
    /<span class="min-w-0 overflow-hidden text-ellipsis">Download<\/span>/,
  );
});

test("text next to an icon can shrink while the icon and accessible name remain intact", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      Button,
      { "aria-label": "Download the full event poster" },
      React.createElement("svg", { "aria-hidden": true }),
      "Download the full event poster",
    ),
  );
  assert.match(html, /<svg aria-hidden="true"><\/svg>/);
  assert.match(
    html,
    /<span class="min-w-0 overflow-hidden text-ellipsis">Download the full event poster<\/span>/,
  );
  assert.match(html, /aria-label="Download the full event poster"/);
});

test("formatting whitespace does not become an extra flex item", () => {
  const html = renderToStaticMarkup(
    React.createElement(Button, {}, " ", React.createElement("span", {}, "Save")),
  );
  assert.doesNotMatch(html, /text-ellipsis"> <\/span>/);
  assert.match(html, /<span>Save<\/span>/);
});

test("an explicitly multiline button can still override the shared single-line default", () => {
  const html = renderToStaticMarkup(
    React.createElement(Button, { className: "whitespace-normal" }, "Confirm"),
  );
  assert.match(html, /whitespace-normal/);
  assert.doesNotMatch(html, /whitespace-nowrap/);
});

test("poster actions have concise labels and retain descriptive accessible labels in every locale", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const copy = getCopy(locale);
    for (const label of [
      copy.activityShare.downloadPosterShort,
      copy.activityShare.savePosterShort,
      copy.activityShare.downloadingShort,
    ]) {
      assert.ok(label.length > 0 && label.length <= 12, `${locale}: ${label}`);
      assert.doesNotMatch(label, /[\r\n]/);
    }
    assert.ok(
      copy.activityShare.downloadPoster.length >
        copy.activityShare.downloadPosterShort.length,
    );
    assert.ok(
      copy.activityShare.downloadPoster.includes(
        copy.activityShare.downloadPosterShort,
      ),
    );
    assert.ok(copy.activityDetail.contactOrganizerShort.length <= 9);
    assert.ok(copy.activityDetail.contactOrganizerLoginShort.length <= 9);
    assert.ok(
      copy.activityDetail.contactOrganizerLogin.length >
        copy.activityDetail.contactOrganizerLoginShort.length,
    );
    assert.ok(
      copy.activityDetail.contactOrganizerLogin.toLocaleLowerCase().includes(
        copy.activityDetail.contactOrganizerLoginShort.toLocaleLowerCase(),
      ),
    );
  }
});
