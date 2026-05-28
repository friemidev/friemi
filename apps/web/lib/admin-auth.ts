import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { hasClerkKeys } from "@/lib/clerk";
import { withLocale } from "@/lib/routes";

const ADMIN_USER_IDS = new Set(
  (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

function readRoleFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const role = (metadata as Record<string, unknown>).role;
  return typeof role === "string" ? role : null;
}

function isAdminUser(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  if (ADMIN_USER_IDS.has(user.id)) {
    return true;
  }

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (email && ADMIN_EMAILS.has(email)) {
    return true;
  }

  const publicRole = readRoleFromMetadata(user.publicMetadata);
  const privateRole = readRoleFromMetadata(user.privateMetadata);
  return publicRole === "admin" || privateRole === "admin";
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

export async function requireAdminApiAccess() {
  if (!hasClerkKeys()) {
    return null;
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

