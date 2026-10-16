import assert from "node:assert/strict";
import test from "node:test";
import {
  activityHostLinkKinds,
  getActivityHostLink,
  getActivityHostLinkCopy,
  getInitialActivityHostLinkKind,
} from "./activityHostLink";

const url = "https://docs.google.com/forms/d/e/example/viewform";

test("host link purposes have localized labels and display the source domain", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    for (const kind of activityHostLinkKinds) {
      const link = getActivityHostLink({ url, label: kind, locale });
      assert.ok(link);
      assert.equal(link.kind, kind);
      assert.equal(link.label, getActivityHostLinkCopy(locale)[kind]);
      assert.equal(link.hostname, "docs.google.com");
      assert.notEqual(link.label, kind);
    }
  }
  assert.equal(
    getActivityHostLink({ url, label: "SUPPLEMENTARY_FORM", locale: "zh-CN" })
      ?.label,
    "补充登记",
  );
});

test("activity information and supplementary forms survive the event ending", () => {
  for (const label of ["VIEW_DETAILS", "SUPPLEMENTARY_FORM", "HOST_LINK"]) {
    assert.ok(getActivityHostLink({ url, label, locale: "en", isEnded: true }));
  }
  assert.equal(
    getActivityHostLink({
      url,
      label: "RESERVE_SPOT",
      locale: "en",
      isEnded: true,
    }),
    null,
  );
  assert.equal(
    getActivityHostLink({
      url,
      label: "Réservation",
      locale: "fr",
      isCancelled: true,
    }),
    null,
  );
  assert.equal(
    getActivityHostLink({ url, label: null, locale: "en", isEnded: true }),
    null,
  );
});

test("editing and draft recovery preserve existing custom and semantic labels", () => {
  assert.equal(getInitialActivityHostLinkKind(), "");
  assert.equal(
    getInitialActivityHostLinkKind({ ticketUrl: url, ticketLabel: "学生票" }),
    "学生票",
  );
  assert.equal(
    getActivityHostLink({ url, label: "学生票", locale: "zh-CN" })?.label,
    "学生票",
  );
  assert.equal(
    getInitialActivityHostLinkKind({
      ticketUrl: url,
      ticketLabel: "En savoir plus",
    }),
    "VIEW_DETAILS",
  );
  assert.equal(
    getInitialActivityHostLinkKind({ ticketUrl: url, ticketLabel: null }),
    "RESERVE_SPOT",
  );
  for (const label of activityHostLinkKinds) {
    assert.equal(
      getInitialActivityHostLinkKind({ ticketUrl: url, ticketLabel: label }),
      label,
    );
  }
});

test("missing and unsafe host links do not create a visible entry", () => {
  for (const value of [
    null,
    "",
    "http://example.com",
    "javascript:alert(1)",
    "https://user:password@example.com",
    "//example.com",
    "not a URL",
  ]) {
    assert.equal(
      getActivityHostLink({ url: value, label: "HOST_LINK", locale: "en" }),
      null,
    );
  }
});
