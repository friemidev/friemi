import { prisma } from "./prisma";
import { ensureUserProfileFriendCode } from "./user-profile-identity";
import { linkGuestParticipationsForProfile } from "@/features/guest-participants/services/linkGuestParticipations";

type ClerkEmailAddressLike = {
  id: string;
  email_address: string;
  verification?: {
    status?: string | null;
  } | null;
};

type ClerkUserLike = {
  id: string;
  email_addresses: ClerkEmailAddressLike[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  image_url: string;
  created_at: number;
  updated_at: number;
  last_sign_in_at: number | null;
};

type ClerkDeletedUserLike = {
  id?: string;
};

function fromUnixMs(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value) : null;
}

function getPrimaryEmail(user: ClerkUserLike) {
  const primaryEmail = user.email_addresses.find((email) => email.id === user.primary_email_address_id);
  return primaryEmail?.email_address ?? user.email_addresses[0]?.email_address ?? null;
}

function getVerifiedEmail(user: ClerkUserLike) {
  const primaryEmail = user.email_addresses.find((email) => email.id === user.primary_email_address_id);

  if (primaryEmail?.verification?.status === "verified") {
    return primaryEmail.email_address;
  }

  const verifiedEmail = user.email_addresses.find(
    (email) => email.verification?.status === "verified",
  );

  return verifiedEmail?.email_address ?? null;
}

function normalizeEmailForComparison(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function getStoredEmailVerifiedAt({
  email,
  previousEmail,
  previousEmailVerifiedAt,
  verifiedEmail,
}: {
  email: string | null;
  previousEmail?: string | null;
  previousEmailVerifiedAt?: Date | null;
  verifiedEmail: string | null;
}) {
  const normalizedEmail = normalizeEmailForComparison(email);

  if (
    !normalizedEmail ||
    normalizedEmail !== normalizeEmailForComparison(verifiedEmail)
  ) {
    return null;
  }

  return normalizedEmail === normalizeEmailForComparison(previousEmail)
    ? (previousEmailVerifiedAt ?? new Date())
    : new Date();
}

function getDisplayName(user: ClerkUserLike) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.username || getPrimaryEmail(user) || "未命名用户";
}

export async function upsertUserProfileFromClerk(user: ClerkUserLike) {
  const email = getPrimaryEmail(user);
  const verifiedEmail = getVerifiedEmail(user);
  const nickname = getDisplayName(user);
  const existing = await prisma.userProfile.findUnique({
    where: {
      clerkUserId: user.id,
    },
    select: {
      email: true,
      emailVerifiedAt: true,
    },
  });
  const emailVerifiedAt = getStoredEmailVerifiedAt({
    email,
    previousEmail: existing?.email,
    previousEmailVerifiedAt: existing?.emailVerifiedAt,
    verifiedEmail,
  });

  const profile = await prisma.userProfile.upsert({
    where: {
      clerkUserId: user.id
    },
    create: {
      clerkUserId: user.id,
      email,
      emailVerifiedAt,
      nickname,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      avatarUrl: user.image_url,
      status: "ACTIVE",
      lastSignInAt: fromUnixMs(user.last_sign_in_at),
      clerkCreatedAt: fromUnixMs(user.created_at),
      clerkUpdatedAt: fromUnixMs(user.updated_at),
      clerkDeletedAt: null,
      syncedAt: new Date()
    },
    update: {
      email,
      emailVerifiedAt,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      avatarUrl: user.image_url,
      status: "ACTIVE",
      lastSignInAt: fromUnixMs(user.last_sign_in_at),
      clerkUpdatedAt: fromUnixMs(user.updated_at),
      clerkDeletedAt: null,
      syncedAt: new Date()
    }
  }).then(ensureUserProfileFriendCode);

  void linkGuestParticipationsForProfile(prisma, {
    ...profile,
    verifiedEmail,
  }).catch((error) => {
    console.error("Failed to link guest participations from Clerk webhook", error);
  });

  return profile;
}

export async function markUserProfileDeletedFromClerk(user: ClerkDeletedUserLike) {
  if (!user.id) {
    return null;
  }

  return prisma.userProfile.updateMany({
    where: {
      clerkUserId: user.id
    },
    data: {
      status: "DELETED",
      clerkDeletedAt: new Date(),
      syncedAt: new Date()
    }
  });
}

export async function touchUserProfileLastSignIn(clerkUserId: string, signedInAt = new Date()) {
  return prisma.userProfile.updateMany({
    where: {
      clerkUserId
    },
    data: {
      lastSignInAt: signedInAt,
      syncedAt: new Date()
    }
  });
}
