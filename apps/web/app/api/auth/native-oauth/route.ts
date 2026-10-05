import { createClerkClient } from "@clerk/backend";
import { NextResponse } from "next/server";
import { verifyAppleNativeProfile } from "@/features/auth/appleNativeAuth";
import {
  findOrCreateNativeOAuthUser,
  type VerifiedNativeOAuthProfile,
} from "@/features/auth/nativeOAuthUser";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NativeOAuthRequest;
    const profile = await verifyNativeOAuth(body);
    const clerk = getClerkClient();
    const user = await findOrCreateNativeOAuthUser(clerk.users, profile);
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

async function verifyNativeOAuth(
  body: NativeOAuthRequest,
): Promise<VerifiedNativeOAuthProfile> {
  if (body.provider === "google") {
    return verifyGoogleToken(body);
  }

  if (body.provider === "apple") {
    return verifyAppleNativeProfile(body, { audience: APPLE_IOS_BUNDLE_ID });
  }

  throw new Error("Unsupported native OAuth provider.");
}

async function verifyGoogleToken(
  body: NativeOAuthRequest,
): Promise<VerifiedNativeOAuthProfile> {
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

function getClerkClient() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Missing CLERK_SECRET_KEY.");
  }

  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
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
