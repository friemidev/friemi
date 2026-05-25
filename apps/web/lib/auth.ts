import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasClerkKeys } from "./clerk";
import { prisma } from "./prisma";

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
    avatarUrl: user.imageUrl
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

export async function ensureCurrentUserProfile(locale = "zh-CN") {
  const clerkUserId = await requireUser(locale);

  if (!hasClerkKeys()) {
    return prisma.userProfile.upsert({
      where: {
        clerkUserId
      },
      create: {
        clerkUserId,
        email: "local-dev@example.com",
        nickname: "本地开发用户",
        status: "ACTIVE",
        syncedAt: new Date()
      },
      update: {
        status: "ACTIVE",
        syncedAt: new Date()
      }
    });
  }

  const user = await currentUser();

  if (!user) {
    redirect(`/${locale}/sign-in`);
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  const nickname = user.fullName || user.username || email || "未命名用户";

  return prisma.userProfile.upsert({
    where: {
      clerkUserId: user.id
    },
    create: {
      clerkUserId: user.id,
      email,
      nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.imageUrl,
      status: "ACTIVE",
      syncedAt: new Date()
    },
    update: {
      email,
      nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.imageUrl,
      status: "ACTIVE",
      clerkDeletedAt: null,
      syncedAt: new Date()
    }
  });
}
