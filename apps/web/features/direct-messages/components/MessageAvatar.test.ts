import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { MessageAvatar } = await import("./MessageAvatar");

test("loaded avatars are positioned inside their circular clipping layer at both sizes", () => {
  for (const size of ["sm", "md"] as const) {
    const html = renderToStaticMarkup(
      React.createElement(MessageAvatar, {
        avatarUrl: "/avatar/female-01.png",
        name: "Maya",
        size,
      }),
    );
    assert.match(
      html,
      /<span class="relative isolate [^"]*overflow-hidden rounded-full">/,
    );
    assert.match(
      html,
      /<img[^>]*absolute inset-0 h-full w-full rounded-full object-cover/,
    );
    assert.ok(html.includes(size === "sm" ? "h-9 w-9" : "h-11 w-11"));
  }
});

test("presence badges remain outside the circular clip", () => {
  for (const presenceDisplayStatus of ["ONLINE", "AWAY"] as const) {
    const html = renderToStaticMarkup(
      React.createElement(MessageAvatar, {
        avatarUrl: "/avatar/male-01.png",
        name: "Alex",
        presenceDisplayStatus,
      }),
    );
    assert.match(html, /<img[^>]*\/><\/span><span aria-hidden="true"/);
    assert.match(
      html,
      /absolute bottom-0 right-0 rounded-full ring-2 ring-white/,
    );
    assert.ok(
      html.includes(presenceDisplayStatus === "AWAY" ? "#F0B84D" : "#2FBF62"),
    );
  }
});

test("missing images preserve the initial fallback and do not add a presence badge", () => {
  const html = renderToStaticMarkup(
    React.createElement(MessageAvatar, { avatarUrl: null, name: " " }),
  );
  assert.match(html, /<span aria-hidden="true">N<\/span>/);
  assert.doesNotMatch(html, /<img|bottom-0/);
});
