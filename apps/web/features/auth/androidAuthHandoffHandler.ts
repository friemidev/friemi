import { z } from "zod";
import {
  androidAuthFlowPattern,
  androidAuthProofPattern,
  normalizeAndroidAuthTarget,
} from "./androidAuthFlow";
import {
  androidHandoffNamespace,
  consumeAndroidHandoff,
  isSameOriginAuthRequest,
  issueAndroidHandoff,
  type AndroidHandoffStore,
} from "./androidAuthHandoff";

const proof = z.string().regex(androidAuthProofPattern);
const flow = z.string().regex(androidAuthFlowPattern);
const bodySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("issue"),
      flow,
      challenge: proof,
      locale: z.enum(["zh-CN", "fr", "en"]),
      target: z.string().max(2048),
    })
    .strict(),
  z
    .object({ action: z.literal("redeem"), flow, code: proof, verifier: proof })
    .strict(),
]);
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });

export type AndroidHandoffDependencies = {
  getConfig: () => {
    store: AndroidHandoffStore | null;
    publishableKey?: string;
    prefix: string;
  };
  getUserId: () => Promise<string | null>;
  createTicket: (userId: string) => Promise<string | null>;
};

export async function handleAndroidHandoff(
  request: Request,
  dependencies: AndroidHandoffDependencies,
) {
  if (!isSameOriginAuthRequest(request))
    return response({ error: "INVALID_ORIGIN" }, 403);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return response({ error: "INVALID_REQUEST" }, 400);
  }
  let json: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return response({ error: "INVALID_REQUEST" }, 400);
    json = JSON.parse(text);
  } catch {
    return response({ error: "INVALID_REQUEST" }, 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return response({ error: "INVALID_REQUEST" }, 400);
  try {
    const { store, publishableKey, prefix } = dependencies.getConfig();
    if (!store || !publishableKey)
      return response({ error: "HANDOFF_UNAVAILABLE" }, 503);
    const namespace = androidHandoffNamespace(
      prefix,
      publishableKey,
      new URL(request.url).origin,
    );
    const body = parsed.data;
    if (body.action === "issue") {
      const userId = await dependencies.getUserId();
      if (!userId) return response({ error: "UNAUTHORIZED" }, 401);
      const count = Number(
        await store.eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
          [`${namespace}:issue:${userId}`],
          [],
        ),
      );
      if (!Number.isFinite(count) || count < 1)
        throw new Error("INVALID_LIMIT");
      if (count > 10) return response({ error: "TOO_MANY_ATTEMPTS" }, 429);
      const code = await issueAndroidHandoff({
        store,
        namespace,
        flow: body.flow,
        challenge: body.challenge,
        userId,
        target: normalizeAndroidAuthTarget(body.locale, body.target),
      });
      return response({ code });
    }
    const identity = await consumeAndroidHandoff({ store, namespace, ...body });
    if (!identity) return response({ error: "INVALID_HANDOFF" }, 400);
    const ticket = await dependencies.createTicket(identity.userId);
    if (!ticket) return response({ error: "UNAUTHORIZED" }, 403);
    return response({ ticket, target: identity.target });
  } catch {
    // Never log a request body, verifier, authorization code or Clerk ticket.
    return response({ error: "HANDOFF_UNAVAILABLE" }, 503);
  }
}
