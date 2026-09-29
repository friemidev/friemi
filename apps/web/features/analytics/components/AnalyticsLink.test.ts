import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { AnalyticsLink } = await import("./AnalyticsLink");

const event = {
  name: "team_create_started",
  entityId: "event-1",
  entityType: "public_event",
  sourceSurface: "public_event_detail",
} as const;

test("analytics links can escape an embedded activity sheet", () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      AnalyticsLink,
      {
        children: "Create group",
        event,
        href: "/zh-CN/public-events/event-1/teams/new",
        target: "_top",
      },
    ),
  );

  assert.match(markup, /target="_top"/);
});

test("regular analytics links keep same-frame navigation", () => {
  const markup = renderToStaticMarkup(
    React.createElement(
      AnalyticsLink,
      {
        children: "Open event",
        event,
        href: "/zh-CN/public-events/event-1",
      },
    ),
  );

  assert.doesNotMatch(markup, /target=/);
});
