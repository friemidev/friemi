import assert from "node:assert/strict";
import test from "node:test";
import { resolveWerewolfTestBotFeatureEnabled } from "./werewolfTestBots";

test("enables Werewolf test bots in local development and Preview", () => {
  assert.equal(
    resolveWerewolfTestBotFeatureEnabled({
      nodeEnvironment: "development",
    }),
    true,
  );
  assert.equal(
    resolveWerewolfTestBotFeatureEnabled({
      nodeEnvironment: "production",
      vercelEnvironment: "preview",
    }),
    true,
  );
});

test("keeps Werewolf test bots disabled in Production", () => {
  assert.equal(
    resolveWerewolfTestBotFeatureEnabled({
      explicitValue: "1",
      nodeEnvironment: "production",
      vercelEnvironment: "production",
    }),
    false,
  );
});

test("allows non-production deployments to explicitly disable test bots", () => {
  assert.equal(
    resolveWerewolfTestBotFeatureEnabled({
      explicitValue: "off",
      nodeEnvironment: "production",
      vercelEnvironment: "preview",
    }),
    false,
  );
});
