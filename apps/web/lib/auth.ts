import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasClerkKeys } from "./clerk";
import { prisma } from "./prisma";
import { ensureUserProfileFriendCode } from "./user-profile-identity";

type ClerkCurrentUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function getCurrentUser() {
  if (!hasClerkKeys()) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  return {
    clerkUserId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: user.fullName ?? user.username ?? "未命名用户",
    avatarUrl: user.imageUrl,
  };
}

export async function requireUser(locale = "zh-CN") {
  if (!hasClerkKeys()) {
    return "local-dev-user";
  }

  const { userId } = await auth();

  if (!userId) {
    redirect(`/${locale}/sign-in`);
  }

  return userId;
}

function getProfileFieldsFromClerkUser(user: ClerkCurrentUser) {
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;
  const nickname = user.username?.trim() ?? "";

  return {
    email,
    nickname,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    avatarUrl: user.imageUrl,
    status: "ACTIVE" as const,
    clerkDeletedAt: null,
    syncedAt: new Date(),
  };
}

function getClerkPrivateNames(user: ClerkCurrentUser) {
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;
  const fullName = user.fullName;
  const firstLastName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");

  return [email, fullName, firstLastName]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
}

async function clearPrivateNicknameIfNeeded<
  TProfile extends { id: string; nickname: string },
>(profile: TProfile, user: ClerkCurrentUser) {
  const nickname = profile.nickname.trim();

  if (
    nickname &&
    !user.username &&
    getClerkPrivateNames(user).includes(nickname.toLowerCase())
  ) {
    await prisma.userProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        nickname: "",
      },
    });

    return {
      ...profile,
      nickname: "",
    };
  }

  return profile;
}

function upsertLocalUserProfile(clerkUserId: string) {
  return prisma.userProfile.upsert({
    where: {
      clerkUserId,
    },
    create: {
      clerkUserId,
      email: "local-dev@example.com",
      nickname: "本地开发用户",
      status: "ACTIVE",
      syncedAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      syncedAt: new Date(),
    },
  }).then(ensureUserProfileFriendCode);
}

function upsertClerkUserProfile(user: ClerkCurrentUser) {
  const profileFields = getProfileFieldsFromClerkUser(user);

  return prisma.userProfile.upsert({
    where: {
      clerkUserId: user.id,
    },
    create: {
      clerkUserId: user.id,
      ...profileFields,
    },
    update: {
      email: profileFields.email,
      firstName: profileFields.firstName,
      lastName: profileFields.lastName,
      username: profileFields.username,
      avatarUrl: profileFields.avatarUrl,
      status: profileFields.status,
      clerkDeletedAt: profileFields.clerkDeletedAt,
      syncedAt: profileFields.syncedAt,
    },
  })
    .then((profile) => clearPrivateNicknameIfNeeded(profile, user))
    .then(ensureUserProfileFriendCode);
}

export async function ensureCurrentUserProfile(locale = "zh-CN") {
  const clerkUserId = await requireUser(locale);

  if (!hasClerkKeys()) {
    return upsertLocalUserProfile(clerkUserId);
  }

  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  return upsertClerkUserProfile(user);
}

export async function getOptionalCurrentUserProfile() {
  if (!hasClerkKeys()) {
    return upsertLocalUserProfile("local-dev-user");
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  return upsertClerkUserProfile(user);
}
