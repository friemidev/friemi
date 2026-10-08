"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { normalizeFriemiCode } from "../friemiCode";
import {
  grantTicketManager,
  inviteTicketRedeemer,
  revokeTicketAccess,
} from "../services/ticketAccessService";

export type AdminTicketAccessFormState = {
  status?:
    | "GRANTED"
    | "INVITED"
    | "ALREADY_ACTIVE"
    | "ALREADY_PENDING"
    | "SELF"
    | "NOT_FOUND"
    | "INVALID"
    | "FORBIDDEN"
    | "FAILED";
};

function readValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function currentAdmin(locale: string, definitionId: string) {
  if (!(await isCurrentUserAdmin())) return null;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${definitionId}/access`,
  );
  return profile.status === "ACTIVE" ? profile : null;
}

function refreshAccess(locale: string, definitionId: string) {
  revalidatePath(withLocale(locale, `/admin/items/${definitionId}/access`), "layout");
  revalidatePath(withLocale(locale, "/profile/store/tickets"), "layout");
  revalidatePath(withLocale(locale, "/profile/ticket-workbench"), "layout");
}

export async function grantTicketManagerAdminAction(
  _previousState: AdminTicketAccessFormState,
  formData: FormData,
): Promise<AdminTicketAccessFormState> {
  const locale = readValue(formData, "locale") || "zh-CN";
  const definitionId = readValue(formData, "definitionId");
  const recipientCode = normalizeFriemiCode(readValue(formData, "recipientCode"));
  if (!definitionId || !recipientCode) return { status: "INVALID" };
  const actor = await currentAdmin(locale, definitionId);
  if (!actor) return { status: "FORBIDDEN" };
  try {
    const result = await grantTicketManager({
      actorProfileId: actor.id,
      definitionId,
      isAdmin: true,
      recipientCode,
    });
    if (result.status === "GRANTED") refreshAccess(locale, definitionId);
    return { status: result.status };
  } catch (error) {
    console.error("Failed to assign ticket manager", error);
    return { status: "FAILED" };
  }
}

export async function inviteTicketRedeemerAdminAction(
  _previousState: AdminTicketAccessFormState,
  formData: FormData,
): Promise<AdminTicketAccessFormState> {
  const locale = readValue(formData, "locale") || "zh-CN";
  const definitionId = readValue(formData, "definitionId");
  const recipientCode = normalizeFriemiCode(readValue(formData, "recipientCode"));
  if (!definitionId || !recipientCode) return { status: "INVALID" };
  const actor = await currentAdmin(locale, definitionId);
  if (!actor) return { status: "FORBIDDEN" };
  try {
    const result = await inviteTicketRedeemer({
      actorProfileId: actor.id,
      definitionId,
      isAdmin: true,
      recipientCode,
    });
    if (result.status === "INVITED") refreshAccess(locale, definitionId);
    return { status: result.status };
  } catch (error) {
    console.error("Failed to invite ticket check-in staff", error);
    return { status: "FAILED" };
  }
}

export async function revokeTicketAccessAdminAction(input: {
  accessId: string;
  definitionId: string;
  locale: string;
}) {
  const actor = await currentAdmin(input.locale, input.definitionId);
  if (!actor) return { status: "FORBIDDEN" as const };
  try {
    const result = await revokeTicketAccess({
      accessId: input.accessId,
      actorProfileId: actor.id,
      isAdmin: true,
    });
    if (result.status === "REVOKED") {
      refreshAccess(input.locale, input.definitionId);
    }
    return result;
  } catch (error) {
    console.error("Failed to revoke ticket access", error);
    return { status: "FAILED" as const };
  }
}
