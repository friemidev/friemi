import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { ActivityCoverImage } = await import("./ActivityCoverImage");

test("activity cover renders category artwork before a remote custom cover", () => {
  const fallbackSrc = "/illustrations/png/music.png";
  const src = "https://images.example.com/custom-cover.jpg";
  const markup = renderToStaticMarkup(
    React.createElement(ActivityCoverImage, {
      alt: "Music plan",
      fallbackSrc,
      loading: "eager",
      src,
    }),
  );

  assert.ok(markup.includes(fallbackSrc));
  assert.ok(markup.includes(src));
  assert.ok(markup.indexOf(fallbackSrc) < markup.indexOf(src));
});

test("activity cover uses category artwork when no custom cover exists", () => {
  const fallbackSrc = "/illustrations/preview/wandering.webp";
  const markup = renderToStaticMarkup(
    React.createElement(ActivityCoverImage, {
      alt: "Walking plan",
      fallbackSrc,
      src: null,
    }),
  );

  assert.ok(markup.includes(fallbackSrc));
  assert.doesNotMatch(markup, /friemi-icon-square-1024/);
});

test("activity cover does not render a duplicate primary for the fallback", () => {
  const fallbackSrc = "/illustrations/preview/music.webp";
  const markup = renderToStaticMarkup(
    React.createElement(ActivityCoverImage, {
      fallbackSrc,
      src: fallbackSrc,
    }),
  );

  assert.equal(markup.match(/<img/g)?.length, 1);
  assert.match(markup, /loading="eager"/);
});
