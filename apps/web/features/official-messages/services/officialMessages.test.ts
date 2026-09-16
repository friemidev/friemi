import assert from "node:assert/strict";
import test from "node:test";
import {
  isOfficialFeedbackAccount,
  officialFeedbackAccountEmail,
} from "./officialMessages";

test("official feedback inbox is restricted to the designated email", () => {
  assert.equal(
    isOfficialFeedbackAccount({ email: officialFeedbackAccountEmail }),
    true,
  );
  assert.equal(
    isOfficialFeedbackAccount({ email: " FRIEMI.DEV@GMAIL.COM " }),
    true,
  );
  assert.equal(
    isOfficialFeedbackAccount({ contactEmail: officialFeedbackAccountEmail }),
    true,
  );
  assert.equal(
    isOfficialFeedbackAccount({ email: "another-user@example.com" }),
    false,
  );
});
