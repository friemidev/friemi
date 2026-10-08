import assert from "node:assert/strict";
import test from "node:test";
import {
  formatOfficialFeedback,
  officialFeedbackSchema,
} from "./officialFeedbackInput";

test("legacy feedback defaults to general without changing its content", () => {
  const parsed = officialFeedbackSchema.parse({ content: "  A concern  " });
  assert.equal(parsed.topic, "GENERAL");
  assert.equal(formatOfficialFeedback(parsed), "A concern");
});

test("child safety reports carry a language-independent marker in the inbox", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const parsed = officialFeedbackSchema.parse({
      locale,
      content: "Test concern",
      topic: "CHILD_SAFETY",
    });
    assert.equal(
      formatOfficialFeedback(parsed),
      "[CHILD SAFETY / CSAE / CSAM]\nTest concern",
    );
  }
});

test("feedback validates topic, length and whitespace", () => {
  for (const input of [
    { content: " " },
    { content: "x" },
    { content: "x".repeat(2001) },
    { content: "Valid text", topic: "INVALID" },
  ])
    assert.equal(officialFeedbackSchema.safeParse(input).success, false);
});
