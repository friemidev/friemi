"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import {
  acceptTicketAccessInvitation,
  declineTicketAccessInvitation,
  inviteTicketRedeemer,
  revokeTicketAccess,
} from "../services/ticketAccessService";

function refreshTicketAccessViews(locale: string) {
  revalidatePath(withLocale(locale, "/profile/ticket-workbench"));
  revalidatePath(withLocale(locale, "/profile/store"));
  revalidatePath(withLocale(locale, "/admin/items"));
}

export async function inviteTicketRedeemerAction(
  definitionId: string,
  recipientCode: string,
  locale: string,
) {
  const actor = await ensureCurrentUserProfile(locale, "/profile/store");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" as const };
  try {
    const result = await inviteTicketRedeemer({
      actorProfileId: actor.id,
      definitionId,
      recipientCode,
      isAdmin: await isCurrentUserAdmin(),
    });
    if (result.status === "INVITED") refreshTicketAccessViews(locale);
    return result;
  } catch (error) {
    console.error("Failed to invite ticket redeemer", error);
    return { status: "FAILED" as const };
  }
}

export async function revokeTicketAccessAction(accessId: string, locale: string) {
  const actor = await ensureCurrentUserProfile(locale, "/profile/store");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" as const };
  try {
    const result = await revokeTicketAccess({
      accessId,
      actorProfileId: actor.id,
      isAdmin: await isCurrentUserAdmin(),
    });
    if (result.status === "REVOKED") refreshTicketAccessViews(locale);
    return result;
  } catch (error) {
    console.error("Failed to revoke ticket access", error);
    return { status: "FAILED" as const };
  }
}

export async function acceptTicketAccessInvitationAction(
  accessId: string,
  locale: string,
) {
  const actor = await ensureCurrentUserProfile(locale, "/profile/ticket-workbench");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" as const };
  try {
    const result = await acceptTicketAccessInvitation({
      accessId,
      actorProfileId: actor.id,
    });
    if (result.status === "ACCEPTED") refreshTicketAccessViews(locale);
    return result;
  } catch (error) {
    console.error("Failed to accept ticket access invitation", error);
    return { status: "FAILED" as const };
  }
}

export async function declineTicketAccessInvitationAction(
  accessId: string,
  locale: string,
) {
  const actor = await ensureCurrentUserProfile(locale, "/profile/ticket-workbench");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" as const };
  try {
    const result = await declineTicketAccessInvitation({
      accessId,
      actorProfileId: actor.id,
    });
    if (result.status === "DECLINED") refreshTicketAccessViews(locale);
    return result;
  } catch (error) {
    console.error("Failed to decline ticket access invitation", error);
    return { status: "FAILED" as const };
  }
}
