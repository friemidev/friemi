import { webcrypto } from "node:crypto";
import type { VerifiedNativeOAuthProfile } from "./nativeOAuthUser";

export type AppleSigningKey = JsonWebKey & { kid?: string };

type AppleNativeRequest = {
  identityToken?: string;
  firstName?: string;
  lastName?: string;
};

let appleJwksCache: { keys: AppleSigningKey[]; expiresAt: number } | null =
  null;

export async function verifyAppleNativeProfile(
  body: AppleNativeRequest,
  options: {
    audience: string;
    getSigningKeys?: () => Promise<AppleSigningKey[]>;
  },
): Promise<VerifiedNativeOAuthProfile> {
  if (typeof body.identityToken !== "string" || !body.identityToken) {
    throw new Error("Missing Apple identity token.");
  }

  const parts = body.identityToken.split(".");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (
    parts.length !== 3 ||
    parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  ) {
    throw new Error("Apple identity token is malformed.");
  }

  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new Error("Apple identity token uses an unsupported signature.");
  }

  const keys = await (options.getSigningKeys ?? getAppleJwks)();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Apple signing key was not found.");

  const subtle = globalThis.crypto?.subtle ?? webcrypto.subtle;
  const key = await subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const isValidSignature = await subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    Buffer.from(encodedSignature, "base64url"),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!isValidSignature)
    throw new Error("Apple identity token signature is invalid.");

  if (payload.iss !== "https://appleid.apple.com") {
    throw new Error("Apple identity token issuer is invalid.");
  }
  if (payload.aud !== options.audience) {
    throw new Error(
      "Apple identity token audience does not match this iOS app.",
    );
  }
  if (
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp) ||
    payload.exp * 1000 <= Date.now()
  ) {
    throw new Error("Apple identity token has expired.");
  }
  if (typeof payload.sub !== "string" || !payload.sub.trim()) {
    throw new Error("Apple identity token is missing a subject.");
  }

  // Client-supplied email is not proof of ownership, even with a valid Apple token.
  const email =
    typeof payload.email === "string" &&
    payload.email.trim() &&
    (payload.email_verified === true || payload.email_verified === "true")
      ? payload.email
      : undefined;

  return {
    provider: "apple",
    subject: payload.sub,
    email,
    firstName: body.firstName || undefined,
    lastName: body.lastName || undefined,
  };
}

async function getAppleJwks() {
  if (appleJwksCache && appleJwksCache.expiresAt > Date.now()) {
    return appleJwksCache.keys;
  }
  const response = await fetch("https://appleid.apple.com/auth/keys", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to fetch Apple signing keys.");

  const body = (await response.json()) as { keys?: AppleSigningKey[] };
  const keys = body.keys ?? [];
  appleJwksCache = { keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return keys;
}

function decodeJwtPart(part: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8"),
    );
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // Return the same error for invalid JSON and non-object claims.
  }
  throw new Error("Apple identity token is malformed.");
}
