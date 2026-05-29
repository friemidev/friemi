import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasClerkKeys } from "@/lib/clerk";
import { withLocale } from "@/lib/routes";
import { hasAdminConfig, isAdminByFields, readRoleFromMetadata } from "@/lib/admin-access";

function isAdminUser(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  return isAdminByFields({
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    publicRole: readRoleFromMetadata(user.publicMetadata),
    privateRole: readRoleFromMetadata(user.privateMetadata),
  });
}

export async function isCurrentUserAdmin() {
  if (!hasClerkKeys() || !hasAdminConfig()) {
    return false;
  }

  const { userId } = await auth();
  if (!userId) {
    return false;
  }

  const user = await currentUser();
  if (!user) {
    return false;
  }

  return isAdminUser(user);
}

export async function requireAdminPageAccess(locale: string) {
  if (!hasClerkKeys()) {
    return;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(withLocale(locale, "/sign-in"));
  }

  const user = await currentUser();
  if (!user || !isAdminUser(user)) {
    redirect(withLocale(locale, "/"));
  }
}


