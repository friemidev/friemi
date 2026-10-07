import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { ActivityDetailFrame, getDetailFrameCopy } =
  await import("./ActivityDetailFrame");

test("the first detail frame exposes its title and loading state before the document loads", () => {
  const html = renderToStaticMarkup(
    React.createElement(ActivityDetailFrame, {
      href: "/zh-CN/lobby/example?sheet=1",
      label: "Weekend plan",
      locale: "en",
      open: true,
      onNavigate() {},
    }),
  );
  assert.match(html, /<h2[^>]*>Weekend plan<\/h2>/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /loading="eager"/);
  assert.match(html, /Loading plan/);
});

test("detail loading, retry and close copy are provided in every supported language", () => {
  assert.equal(getDetailFrameCopy("zh-CN").close, "关闭");
  assert.equal(getDetailFrameCopy("en").retry, "Try again");
  assert.equal(getDetailFrameCopy("fr").close, "Fermer");
  for (const locale of ["zh-CN", "en", "fr"]) {
    for (const value of Object.values(getDetailFrameCopy(locale)))
      assert.ok(value.length > 0);
  }
});
