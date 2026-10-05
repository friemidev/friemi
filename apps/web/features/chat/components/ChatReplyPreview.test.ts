import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { ChatReplyBubblePreview, ChatReplyComposerPreview } =
  await import("./ChatReplyPreview");

const replyTo = {
  body: "See you\n  tomorrow",
  hasImage: false,
  messageId: "quoted-message",
  senderName: "Maya",
};

test("quoted messages use a compact, neutral blockquote with a two-line limit", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatReplyBubblePreview, { locale: "en", replyTo }),
  );
  assert.match(html, /^<blockquote/);
  assert.match(html, /line-clamp-2/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /Maya: /);
  assert.match(html, /See you tomorrow/);
  assert.doesNotMatch(html, /border-l-|text-white|bg-black/);
});

test("image-only quotes keep the image indicator in each supported locale", () => {
  for (const [locale, expected] of [
    ["zh-CN", "[图片]"],
    ["fr", "[Image]"],
    ["en", "[Image]"],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(ChatReplyBubblePreview, {
        locale,
        replyTo: { ...replyTo, body: " ", hasImage: true },
      }),
    );
    assert.ok(html.includes(expected));
    assert.match(html, /<svg/);
  }
});

test("quote content is escaped and the composer keeps an accessible cancel control", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChatReplyComposerPreview, {
      locale: "en",
      onCancel: () => {},
      replyTo: { ...replyTo, body: "<script>unsafe</script>" },
    }),
  );
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /aria-label="Cancel reply"/);
  assert.match(html, /type="button"/);
});
