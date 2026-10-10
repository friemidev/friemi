"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isUploadedInventoryItemImageUrl } from "@/lib/activity-cover-storage";
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
  updateInventoryDefinitionImage,
} from "../services/inventoryService";
import { setTicketMerchant } from "../services/ticketAccessService";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const definitionSchema = z.object({
  description: z.string().trim().max(1200),
  imageUrl: z.string().trim().max(2048),
  isGiftable: z.boolean(),
  merchantId: z.string().trim().max(64),
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

export type UpdateTicketImageState = {
  status?: "UPDATED" | "FORBIDDEN" | "INVALID" | "FAILED";
};

export type SetTicketMerchantState = {
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
    imageUrl: getString(formData, "imageUrl"),
    isGiftable: getString(formData, "isGiftable") === "on",
    merchantId: getString(formData, "merchantId"),
    title: getString(formData, "title"),
    totalSupply: getString(formData, "totalSupply"),
  });
  if (
    !parsed.success ||
    (parsed.data.imageUrl &&
      !isUploadedInventoryItemImageUrl(parsed.data.imageUrl))
  ) {
    return { status: "INVALID" };
  }

  const actor = await ensureCurrentUserProfile(locale, "/admin/items/new");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };
  try {
    const definition = await createTicketDefinition({
      actorProfileId: actor.id,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || null,
      isGiftable: parsed.data.isGiftable,
      merchantId: parsed.data.merchantId || null,
      title: parsed.data.title,
      totalSupply: parsed.data.totalSupply,
    });
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(
      withLocale(locale, `/admin/items/${definition.id}`),
      "layout",
    );
    return { definitionId: definition.id, status: "CREATED" };
  } catch (error) {
    console.error("Failed to create inventory ticket definition", error);
    return { status: "FAILED" };
  }
}

export async function setTicketMerchantAction(
  _previousState: SetTicketMerchantState,
  formData: FormData,
): Promise<SetTicketMerchantState> {
  const locale = getString(formData, "locale") || "zh-CN";
  if (!(await isCurrentUserAdmin())) return { status: "FORBIDDEN" };
  const parsed = z
    .object({
      definitionId: z.string().min(1).max(64),
      merchantId: z.string().trim().max(64),
    })
    .safeParse({
      definitionId: getString(formData, "definitionId"),
      merchantId: getString(formData, "merchantId"),
    });
  if (!parsed.success) return { status: "INVALID" };
  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${parsed.data.definitionId}/access`,
  );
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };
  try {
    const result = await setTicketMerchant({
      actorProfileId: actor.id,
      definitionId: parsed.data.definitionId,
      isAdmin: true,
      merchantId: parsed.data.merchantId || null,
    });
    if (result.status === "FORBIDDEN") return { status: "FORBIDDEN" };
    if (result.status !== "UPDATED") return { status: "INVALID" };
    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(withLocale(locale, "/profile/store"), "layout");
    revalidatePath(withLocale(locale, "/profile/store/tickets"), "layout");
    revalidatePath(withLocale(locale, "/profile/ticket-workbench"), "layout");
    revalidatePath(
      withLocale(locale, `/admin/items/${parsed.data.definitionId}`),
      "layout",
    );
    return { status: "UPDATED" };
  } catch (error) {
    console.error("Failed to update ticket merchant binding", error);
    return { status: "FAILED" };
  }
}

export async function updateTicketImageAction(
  _previousState: UpdateTicketImageState,
  formData: FormData,
): Promise<UpdateTicketImageState> {
  const locale = getString(formData, "locale") || "zh-CN";
  if (!(await isCurrentUserAdmin())) return { status: "FORBIDDEN" };

  const parsed = z
    .object({
      definitionId: z.string().min(1),
      imageUrl: z.string().trim().max(2048),
    })
    .safeParse({
      definitionId: getString(formData, "definitionId"),
      imageUrl: getString(formData, "imageUrl"),
    });
  if (
    !parsed.success ||
    (parsed.data.imageUrl &&
      !isUploadedInventoryItemImageUrl(parsed.data.imageUrl))
  ) {
    return { status: "INVALID" };
  }

  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${parsed.data.definitionId}/settings`,
  );
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };

  try {
    const updated = await updateInventoryDefinitionImage({
      definitionId: parsed.data.definitionId,
      imageUrl: parsed.data.imageUrl || null,
    });
    if (!updated) return { status: "INVALID" };

    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(withLocale(locale, "/admin/items"));
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(
      withLocale(locale, `/admin/items/${parsed.data.definitionId}`),
      "layout",
    );
    revalidatePath(
      withLocale(locale, `/admin/items/tickets/${parsed.data.definitionId}`),
      "layout",
    );
    revalidatePath(withLocale(locale, "/profile/bag"));
    revalidatePath(
      withLocale(locale, `/profile/bag/items/${parsed.data.definitionId}`),
    );
    return { status: "UPDATED" };
  } catch (error) {
    console.error("Failed to update inventory item image", error);
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

  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${definitionId}/settings`,
  );
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };

  try {
    const updated = await setTicketGiftable({
      definitionId,
      isGiftable: giftableValue === "true",
    });
    if (!updated) return { status: "INVALID" };
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(
      withLocale(locale, `/admin/items/${definitionId}`),
      "layout",
    );
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

  const actor = await ensureCurrentUserProfile(
    locale,
    `/admin/items/${parsed.data.definitionId}/issue`,
  );
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };
  try {
    const result = await issueTicketBatch({
      actorProfileId: actor.id,
      ...parsed.data,
    });
    if (result.status !== "ISSUED") return { status: result.status };
    revalidatePath(withLocale(locale, "/admin/items/tickets"));
    revalidatePath(withLocale(locale, "/admin/merchants"));
    revalidatePath(
      withLocale(locale, `/admin/items/${parsed.data.definitionId}`),
      "layout",
    );
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
