import { createHash, randomBytes } from "node:crypto";
import {
  androidAuthFlowPattern,
  androidAuthProofPattern,
} from "./androidAuthFlow";

export const androidHandoffTtlSeconds = 120;
export type AndroidHandoffStore = {
  set: (
    key: string,
    value: string,
    options: { ex: number; nx: true },
  ) => Promise<unknown>;
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
};
type HandoffIdentity = { userId: string; target: string };
const digest = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

export function androidHandoffNamespace(
  prefix: string,
  publishableKey: string,
  origin: string,
) {
  return `${prefix}:android-auth:${digest(`${publishableKey}\n${origin}`)}`;
}

export function isSameOriginAuthRequest(request: Request) {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    !["cross-site", "same-site"].includes(
      request.headers.get("sec-fetch-site") ?? "",
    )
  );
}

export async function issueAndroidHandoff(
  input: {
    store: AndroidHandoffStore;
    namespace: string;
    flow: string;
    challenge: string;
  } & HandoffIdentity,
) {
  if (
    !androidAuthFlowPattern.test(input.flow) ||
    !androidAuthProofPattern.test(input.challenge)
  )
    throw new Error("INVALID_FLOW");
  const code = randomBytes(32).toString("base64url");
  const result = await input.store.set(
    `${input.namespace}:code:${digest(code)}`,
    JSON.stringify({
      flow: input.flow,
      challenge: input.challenge,
      userId: input.userId,
      target: input.target,
    }),
    { ex: androidHandoffTtlSeconds, nx: true },
  );
  if (result !== "OK") throw new Error("HANDOFF_UNAVAILABLE");
  return code;
}

// Compare the device proof before deleting, in one Redis operation. A wrong
// proof cannot consume another device's code; concurrent redemption wins once.
export const consumeAndroidHandoffScript = `
local value = redis.call('GET', KEYS[1])
if not value then return nil end
local data = cjson.decode(value)
if data.flow ~= ARGV[1] or data.challenge ~= ARGV[2] then return nil end
redis.call('DEL', KEYS[1])
return cjson.encode({userId=data.userId, target=data.target})`;

export async function consumeAndroidHandoff(input: {
  store: AndroidHandoffStore;
  namespace: string;
  code: string;
  flow: string;
  verifier: string;
}): Promise<HandoffIdentity | null> {
  if (
    !androidAuthFlowPattern.test(input.flow) ||
    !androidAuthProofPattern.test(input.code) ||
    !androidAuthProofPattern.test(input.verifier)
  )
    return null;
  const result = await input.store.eval(
    consumeAndroidHandoffScript,
    [`${input.namespace}:code:${digest(input.code)}`],
    [input.flow, digest(input.verifier)],
  );
  if (!result) return null;
  const identity =
    typeof result === "string"
      ? (JSON.parse(result) as HandoffIdentity)
      : (result as HandoffIdentity);
  return typeof identity.userId === "string" &&
    typeof identity.target === "string"
    ? identity
    : null;
}
