import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminByFields, readRoleFromMetadata } from "./admin-access";
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

async function upsertClerkUserProfile(user: ClerkCurrentUser) {
  const profileFields = getProfileFieldsFromClerkUser(user);

  // Try to find an existing profile first. On create we will run the
  // private-name-based nickname clearing logic; on update we keep the
  // existing nickname untouched.
  const existing = await prisma.userProfile.findUnique({
    where: { clerkUserId: user.id },
  });

  if (!existing) {
    const created = await prisma.userProfile.create({
      data: {
        clerkUserId: user.id,
        ...profileFields,
      },
    });

    return ensureUserProfileFriendCode(created);
  }

  const updated = await prisma.userProfile.update({
    where: { id: existing.id },
    data: {
      email: profileFields.email,
      firstName: profileFields.firstName,
      lastName: profileFields.lastName,
      username: profileFields.username,
      avatarUrl: profileFields.avatarUrl,
      status: profileFields.status,
      clerkDeletedAt: profileFields.clerkDeletedAt,
      syncedAt: profileFields.syncedAt,
    },
  });

  return ensureUserProfileFriendCode(updated);
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

export async function ensureCurrentUserProfileSnapshot(locale = "zh-CN") {
  const clerkUserId = await requireUser(locale);

  if (!hasClerkKeys()) {
    return upsertLocalUserProfile(clerkUserId);
  }

  const existingProfile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId,
    },
  });

  if (existingProfile) {
    return ensureUserProfileFriendCode(existingProfile);
  }

  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  return upsertClerkUserProfile(user);
}

export async function getOptionalCurrentUserProfileSnapshot() {
  if (!hasClerkKeys()) {
    return upsertLocalUserProfile("local-dev-user");
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const existingProfile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (existingProfile) {
    return ensureUserProfileFriendCode(existingProfile);
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  return upsertClerkUserProfile(user);
}

type LayoutViewerProfile = {
  friendCode: string | null;
  id: string;
  nickname: string;
};

type LayoutViewerState = {
  profile: LayoutViewerProfile | null;
  showAdminNav: boolean;
};

function getLayoutViewerProfile(profile: LayoutViewerProfile) {
  return {
    friendCode: profile.friendCode,
    id: profile.id,
    nickname: profile.nickname,
  };
}

function isAdminUser(user: ClerkCurrentUser) {
  return isAdminByFields({
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    publicRole: readRoleFromMetadata(user.publicMetadata),
    privateRole: readRoleFromMetadata(user.privateMetadata),
  });
}

export async function getOptionalLayoutViewerState(): Promise<LayoutViewerState> {
  if (!hasClerkKeys()) {
    const profile = await upsertLocalUserProfile("local-dev-user");

    return {
      profile: getLayoutViewerProfile(profile),
      showAdminNav: false,
    };
  }

  const { userId } = await auth();

  if (!userId) {
    return {
      profile: null,
      showAdminNav: false,
    };
  }

  const profile = await prisma.userProfile.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      friendCode: true,
      id: true,
      nickname: true,
      role: true,
      status: true,
    },
  });

  if (profile?.status === "ACTIVE" && profile.role === "ADMIN") {
    return {
      profile: getLayoutViewerProfile(profile),
      showAdminNav: true,
    };
  }

  const user = await currentUser();

  if (!user) {
    return {
      profile: profile ? getLayoutViewerProfile(profile) : null,
      showAdminNav: false,
    };
  }

  if (!profile) {
    const createdProfile = await upsertClerkUserProfile(user);

    return {
      profile: getLayoutViewerProfile(createdProfile),
      showAdminNav: isAdminUser(user),
    };
  }

  return {
    profile: getLayoutViewerProfile(profile),
    showAdminNav: isAdminUser(user),
  };
}
