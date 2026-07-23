import { createClerkClient } from "@clerk/backend";
import { NextResponse } from "next/server";
import { webcrypto } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GOOGLE_IOS_CLIENT_ID =
  process.env.GOOGLE_IOS_CLIENT_ID ??
  "114440097515-l4nse3gdjm6s12n5vu78a22gmch41560.apps.googleusercontent.com";
const APPLE_IOS_BUNDLE_ID = process.env.APPLE_IOS_BUNDLE_ID ?? "com.friemi.app";

type NativeOAuthProvider = "google" | "apple";

type NativeOAuthRequest = {
  provider?: NativeOAuthProvider;
  idToken?: string;
  identityToken?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

type VerifiedOAuthProfile = {
  provider: NativeOAuthProvider;
  subject: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type AppleJwk = JsonWebKey & {
  alg?: string;
  kid?: string;
};

type AppleJwtHeader = {
  alg?: string;
  kid?: string;
};

type AppleJwtPayload = {
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  exp?: number;
  iss?: string;
  sub?: string;
};

let appleJwksCache: { keys: AppleJwk[]; expiresAt: number } | null = null;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NativeOAuthRequest;
    const profile = await verifyNativeOAuth(body);
    const user = await findOrCreateClerkUser(profile);
    const clerk = getClerkClient();
    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    });

    return NextResponse.json({
      signInUrl: signInToken.url,
      ticket: signInToken.token,
      userId: user.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Native OAuth sign-in failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function verifyNativeOAuth(body: NativeOAuthRequest): Promise<VerifiedOAuthProfile> {
  if (body.provider === "google") {
    return verifyGoogleToken(body);
  }

  if (body.provider === "apple") {
    return verifyAppleToken(body);
  }

  throw new Error("Unsupported native OAuth provider.");
}

async function verifyGoogleToken(body: NativeOAuthRequest): Promise<VerifiedOAuthProfile> {
  if (!body.idToken) {
    throw new Error("Missing Google ID token.");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.idToken)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Google token verification failed.");
  }

  const payload = (await response.json()) as {
    aud?: string;
    email?: string;
    email_verified?: boolean | string;
    family_name?: string;
    given_name?: string;
    name?: string;
    sub?: string;
  };

  if (payload.aud !== GOOGLE_IOS_CLIENT_ID) {
    throw new Error("Google token audience does not match this iOS app.");
  }

  if (!payload.sub) {
    throw new Error("Google token is missing a subject.");
  }

  if (!payload.email || !isVerifiedEmail(payload.email_verified)) {
    throw new Error("Google account email is not verified.");
  }

  const nameParts = splitDisplayName(payload.name);

  return {
    provider: "google",
    subject: payload.sub,
    email: payload.email,
    firstName: payload.given_name ?? nameParts.firstName,
    lastName: payload.family_name ?? nameParts.lastName,
  };
}

async function verifyAppleToken(body: NativeOAuthRequest): Promise<VerifiedOAuthProfile> {
  if (!body.identityToken) {
    throw new Error("Missing Apple identity token.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = body.identityToken.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Apple identity token is malformed.");
  }

  const header = decodeJwtPart<AppleJwtHeader>(encodedHeader);
  const payload = decodeJwtPart<AppleJwtPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Apple identity token uses an unsupported signature.");
  }

  const keys = await getAppleJwks();
  const jwk = keys.find((key) => key.kid === header.kid);

  if (!jwk) {
    throw new Error("Apple signing key was not found.");
  }

  const isValidSignature = await verifyAppleJwtSignature(
    jwk,
    `${encodedHeader}.${encodedPayload}`,
    encodedSignature,
  );

  if (!isValidSignature) {
    throw new Error("Apple identity token signature is invalid.");
  }

  if (payload.iss !== "https://appleid.apple.com") {
    throw new Error("Apple identity token issuer is invalid.");
  }

  if (payload.aud !== APPLE_IOS_BUNDLE_ID) {
    throw new Error("Apple identity token audience does not match this iOS app.");
  }

  if (!payload.exp || payload.exp * 1000 < Date.now()) {
    throw new Error("Apple identity token has expired.");
  }

  if (!payload.sub) {
    throw new Error("Apple identity token is missing a subject.");
  }

  const email =
    payload.email && isVerifiedEmail(payload.email_verified) ? payload.email : body.email;

  return {
    provider: "apple",
    subject: payload.sub,
    email: email || undefined,
    firstName: body.firstName || undefined,
    lastName: body.lastName || undefined,
  };
}

async function findOrCreateClerkUser(profile: VerifiedOAuthProfile) {
  const clerk = getClerkClient();
  const externalId = `${profile.provider}:${profile.subject}`;

  const usersByExternalId = await clerk.users.getUserList({
    externalId: [externalId],
    limit: 1,
  });
  const linkedUser = usersByExternalId.data[0];

  if (linkedUser) {
    return linkedUser;
  }

  if (!profile.email) {
    throw new Error("This account must share an email before it can sign in.");
  }

  const usersByEmail = await clerk.users.getUserList({
    emailAddress: [profile.email],
    limit: 1,
  });
  const existingUser = usersByEmail.data[0];

  if (existingUser) {
    if (!existingUser.externalId) {
      try {
        return await clerk.users.updateUser(existingUser.id, { externalId });
      } catch {
        return existingUser;
      }
    }

    return existingUser;
  }

  return clerk.users.createUser({
    emailAddress: [profile.email],
    externalId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    skipLegalChecks: true,
    skipPasswordRequirement: true,
    unsafeMetadata: {
      nativeOAuthProvider: profile.provider,
    },
  });
}

function getClerkClient() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Missing CLERK_SECRET_KEY.");
  }

  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

async function getAppleJwks() {
  if (appleJwksCache && appleJwksCache.expiresAt > Date.now()) {
    return appleJwksCache.keys;
  }

  const response = await fetch("https://appleid.apple.com/auth/keys", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch Apple signing keys.");
  }

  const body = (await response.json()) as { keys?: AppleJwk[] };
  const keys = body.keys ?? [];
  appleJwksCache = {
    keys,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };

  return keys;
}

async function verifyAppleJwtSignature(
  jwk: AppleJwk,
  signingInput: string,
  encodedSignature: string,
) {
  const subtle = globalThis.crypto?.subtle ?? webcrypto.subtle;
  const key = await subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(signingInput),
  );
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(Buffer.from(base64UrlToBytes(part)).toString("utf8")) as T;
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}

function isVerifiedEmail(value: boolean | string | undefined) {
  return value === true || value === "true" || value === "1";
}

function splitDisplayName(name: string | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { firstName: parts[0], lastName: undefined };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1),
  };
}
