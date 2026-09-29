import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { AaPaymentMethods } = await import("./AaPaymentMethods");

test("compact payment methods show the recipient's available method", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AaPaymentMethods, {
      compact: true,
      contactEmail: "recipient@example.com",
      locale: "zh-CN",
      payeeName: "收款人",
      wechatId: null,
    }),
  );

  assert.match(markup, /收款方付款方式/);
  assert.match(markup, /PayPal/);
  assert.match(markup, /recipient@example\.com/);
  assert.doesNotMatch(markup, /Revolut/);
});

test("compact payment methods keep an offline fallback", () => {
  const markup = renderToStaticMarkup(
    React.createElement(AaPaymentMethods, {
      compact: true,
      contactEmail: null,
      locale: "zh-CN",
      payeeName: "收款人",
      wechatId: null,
    }),
  );

  assert.match(markup, /线下协商/);
  assert.match(markup, /请与收款人确认/);
  assert.doesNotMatch(markup, /IBAN/);
});
