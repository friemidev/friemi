import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { hasClerkKeys } from "@/lib/clerk";
import { withLocale } from "@/lib/routes";
import { isAdminByFields, readRoleFromMetadata } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

function isAdminUser(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  return isAdminByFields({
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    publicRole: readRoleFromMetadata(user.publicMetadata),
    privateRole: readRoleFromMetadata(user.privateMetadata),
  });
}

async function isAdminByDatabaseRole(clerkUserId: string) {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: {
        clerkUserId,
      },
      select: {
        role: true,
        status: true,
      },
    });

    return profile?.status === "ACTIVE" && profile.role === "ADMIN";
  } catch {
    // First deploys can briefly run before the role column is pushed.
    // Keep env and Clerk metadata as the emergency fallback.
    return false;
  }
}

async function isAdminWithFallback(userId: string) {
  if (await isAdminByDatabaseRole(userId)) {
    return true;
  }

  const user = await currentUser();
  if (!user) {
    return false;
  }

  return isAdminUser(user);
}

export async function isCurrentUserAdmin() {
  if (!hasClerkKeys()) {
    return false;
  }

  const { userId } = await auth();
  if (!userId) {
    return false;
  }

  return isAdminWithFallback(userId);
}

export async function requireAdminPageAccess(locale: string) {
  if (!hasClerkKeys()) {
    return;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(withLocale(locale, "/sign-in"));
  }

  if (!(await isAdminWithFallback(userId))) {
    redirect(withLocale(locale, "/"));
  }
}

export async function requireAdminApiAccess() {
  if (!hasClerkKeys()) {
    return null;
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdminWithFallback(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
