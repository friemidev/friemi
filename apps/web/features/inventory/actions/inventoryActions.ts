"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { normalizeFriemiCode } from "../friemiCode";
import {
  createTicketDefinition,
  findActiveProfileByFriemiCode,
  giftTicketByFriemiCode,
  issueTicketBatch,
  setTicketGiftable,
} from "../services/inventoryService";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const definitionSchema = z.object({
  description: z.string().trim().max(1200),
  isGiftable: z.boolean(),
  title: z.string().trim().min(2).max(120),
  totalSupply: z.coerce.number().int().min(1).max(100_000),
});

const issueSchema = z.object({
  definitionId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(2_000),
  recipientCode: z.string().min(1),
  requestId: z.string().uuid(),
});

const giftSchema = z.object({
  definitionId: z.string().min(1),
  method: z.enum(["FRIEMI_CODE", "FRIEND_QR"]),
  recipientCode: z.string().min(1),
  requestId: z.string().uuid(),
});

export type CreateTicketDefinitionState = {
  definitionId?: string;
  status?: "CREATED" | "FORBIDDEN" | "INVALID" | "FAILED";
};

export type IssueTicketState = {
  batchId?: string;
  recipientName?: string;
  status?:
    | "ISSUED"
    | "FORBIDDEN"
    | "INVALID"
    | "NOT_FOUND"
    | "SOLD_OUT"
    | "FAILED";
};

export type GiftTicketState = {
  giftId?: string;
  recipientName?: string;
  serialNumber?: number;
  status?:
    | "GIFTED"
    | "INVALID"
    | "NOT_FOUND"
    | "SELF"
    | "NOT_GIFTABLE"
    | "NO_TICKETS"
    | "FAILED";
};

export type SetTicketGiftableState = {
  status?: "UPDATED" | "FORBIDDEN" | "INVALID" | "FAILED";
};

export async function lookupInventoryRecipientAction(
  locale: string,
  rawCode: string,
) {
  await ensureCurrentUserProfile(locale, "/profile/bag");
  const code = normalizeFriemiCode(rawCode);
  if (!code) return { status: "INVALID" as const };
  const profile = await findActiveProfileByFriemiCode(code);
  if (!profile) return { status: "NOT_FOUND" as const };
  return { status: "FOUND" as const, profile };
}

export async function createTicketDefinitionAction(
  _previousState: CreateTicketDefinitionState,
  formData: FormData,
): Promise<CreateTicketDefinitionState> {
  const locale = getString(formData, "locale") || "zh-CN";
  if (!(await isCurrentUserAdmin())) return { status: "FORBIDDEN" };
  const parsed = definitionSchema.safeParse({
    description: getString(formData, "description"),
    isGiftable: getString(formData, "isGiftable") === "on",
    title: getString(formData, "title"),
    totalSupply: getString(formData, "totalSupply"),
  });
  if (!parsed.success) return { status: "INVALID" };

  const actor = await ensureCurrentUserProfile(locale, "/admin/merchants?view=items");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };
  try {
    const definition = await createTicketDefinition({
      actorProfileId: actor.id,
      description: parsed.data.description || null,
      isGiftable: parsed.data.isGiftable,
      title: parsed.data.title,
      totalSupply: parsed.data.totalSupply,
    });
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(withLocale(locale, "/admin/merchants"));
    return { definitionId: definition.id, status: "CREATED" };
  } catch (error) {
    console.error("Failed to create inventory ticket definition", error);
    return { status: "FAILED" };
  }
}

export async function setTicketGiftableAction(
  _previousState: SetTicketGiftableState,
  formData: FormData,
): Promise<SetTicketGiftableState> {
  const locale = getString(formData, "locale") || "zh-CN";
  if (!(await isCurrentUserAdmin())) return { status: "FORBIDDEN" };
  const definitionId = getString(formData, "definitionId");
  const giftableValue = getString(formData, "isGiftable");
  if (!definitionId || !["true", "false"].includes(giftableValue)) {
    return { status: "INVALID" };
  }

  const actor = await ensureCurrentUserProfile(locale, "/admin/merchants?view=items");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };

  try {
    const updated = await setTicketGiftable({
      definitionId,
      isGiftable: giftableValue === "true",
    });
    if (!updated) return { status: "INVALID" };
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(withLocale(locale, "/profile/bag"));
    revalidatePath(withLocale(locale, `/profile/bag/items/${definitionId}`));
    return { status: "UPDATED" };
  } catch (error) {
    console.error("Failed to update ticket giftability", error);
    return { status: "FAILED" };
  }
}

export async function issueTicketBatchAction(
  _previousState: IssueTicketState,
  formData: FormData,
): Promise<IssueTicketState> {
  const locale = getString(formData, "locale") || "zh-CN";
  if (!(await isCurrentUserAdmin())) return { status: "FORBIDDEN" };
  const parsed = issueSchema.safeParse({
    definitionId: getString(formData, "definitionId"),
    quantity: getString(formData, "quantity"),
    recipientCode: getString(formData, "recipientCode"),
    requestId: getString(formData, "requestId"),
  });
  if (!parsed.success || !normalizeFriemiCode(parsed.data.recipientCode)) {
    return { status: "INVALID" };
  }

  const actor = await ensureCurrentUserProfile(locale, "/admin/merchants?view=items");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };
  try {
    const result = await issueTicketBatch({
      actorProfileId: actor.id,
      ...parsed.data,
    });
    if (result.status !== "ISSUED") return { status: result.status };
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(withLocale(locale, "/profile/bag"));
    return result;
  } catch (error) {
    console.error("Failed to issue inventory tickets", error);
    return { status: "FAILED" };
  }
}

export async function giftTicketAction(
  _previousState: GiftTicketState,
  formData: FormData,
): Promise<GiftTicketState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const parsed = giftSchema.safeParse({
    definitionId: getString(formData, "definitionId"),
    method: getString(formData, "method"),
    recipientCode: getString(formData, "recipientCode"),
    requestId: getString(formData, "requestId"),
  });
  if (!parsed.success || !normalizeFriemiCode(parsed.data.recipientCode)) {
    return { status: "INVALID" };
  }

  const sender = await ensureCurrentUserProfile(
    locale,
    `/profile/bag/items/${parsed.data.definitionId}`,
  );
  if (sender.status !== "ACTIVE") return { status: "INVALID" };
  try {
    const result = await giftTicketByFriemiCode({
      ...parsed.data,
      senderProfileId: sender.id,
    });
    if (result.status !== "GIFTED") return { status: result.status };
    revalidatePath(withLocale(locale, "/profile/bag"));
    revalidatePath(
      withLocale(locale, `/profile/bag/items/${parsed.data.definitionId}`),
    );
    return result;
  } catch (error) {
    console.error("Failed to gift inventory ticket", error);
    return { status: "FAILED" };
  }
}
