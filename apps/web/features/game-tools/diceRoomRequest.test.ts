import assert from "node:assert/strict";
import test from "node:test";
import { isDiceSameOrigin } from "./diceRoomRequest";

test("room writes require the browser-facing same origin", () => {
  const url = "http://0.0.0.0:3000/api/game-tools/dice/rooms";
  const make = (origin?: string, forwardedProtocol?: string) => new Request(url, { method: "POST", headers: {
    host: "localhost:3000", ...(origin ? { origin } : {}), ...(forwardedProtocol ? { "x-forwarded-proto": forwardedProtocol } : {}),
  } });
  assert.equal(isDiceSameOrigin(make("http://localhost:3000")), true);
  assert.equal(isDiceSameOrigin(make("http://evil.test")), false);
  assert.equal(isDiceSameOrigin(make()), false);
  assert.equal(isDiceSameOrigin(make("https://localhost:3000", "https")), true);
  assert.equal(isDiceSameOrigin(make("null")), false);
});
