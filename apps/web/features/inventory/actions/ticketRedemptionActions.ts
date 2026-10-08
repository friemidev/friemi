"use server";

import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import {
  generateTicketRedemptionToken,
  previewTicketRedemption,
  redeemTicketByToken,
  type GenerateTicketRedemptionTokenResult,
  type RedeemTicketByTokenResult,
  type TicketRedemptionPreviewResult,
} from "../services/ticketRedemptionService";

type TicketActionFailure = { status: "FORBIDDEN" | "FAILED" };

function isValidExpectedDefinitionId(value: string | undefined) {
  return (
    value === undefined ||
    (typeof value === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(value))
  );
}

export async function generateTicketRedemptionTokenAction(
  itemId: string,
  locale: string,
): Promise<GenerateTicketRedemptionTokenResult | TicketActionFailure> {
  const actor = await ensureCurrentUserProfile(locale, "/profile/bag");
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };

  try {
    return await generateTicketRedemptionToken({
      itemId,
      ownerProfileId: actor.id,
    });
  } catch (error) {
    console.error("Failed to generate ticket redemption token", error);
    return { status: "FAILED" };
  }
}

export async function getTicketRedemptionPreview(
  token: string,
  locale: string,
  expectedDefinitionId?: string,
  holderFriendCode?: string,
): Promise<TicketRedemptionPreviewResult | TicketActionFailure> {
  if (!isValidExpectedDefinitionId(expectedDefinitionId)) {
    return { status: "INVALID" };
  }
  const actor = await ensureCurrentUserProfile(
    locale,
    `/tickets/redeem/${encodeURIComponent(token)}`,
  );
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };

  try {
    return await previewTicketRedemption({
      actorProfileId: actor.id,
      expectedDefinitionId,
      holderFriendCode,
      isAdmin: await isCurrentUserAdmin(),
      token,
    });
  } catch (error) {
    console.error("Failed to preview ticket redemption", error);
    return { status: "FAILED" };
  }
}

export async function redeemTicketByTokenAction(
  token: string,
  locale: string,
  expectedDefinitionId?: string,
  holderFriendCode?: string,
): Promise<RedeemTicketByTokenResult | TicketActionFailure> {
  if (!isValidExpectedDefinitionId(expectedDefinitionId)) {
    return { status: "INVALID" };
  }
  const actor = await ensureCurrentUserProfile(
    locale,
    `/tickets/redeem/${encodeURIComponent(token)}`,
  );
  if (actor.status !== "ACTIVE") return { status: "FORBIDDEN" };

  try {
    const result = await redeemTicketByToken({
      actorProfileId: actor.id,
      expectedDefinitionId,
      holderFriendCode,
      isAdmin: await isCurrentUserAdmin(),
      token,
    });
    if (result.status === "REDEEMED") {
      revalidatePath(withLocale(locale, "/profile/bag"));
      revalidatePath(
        withLocale(locale, `/profile/bag/items/${result.definitionId}`),
      );
      revalidatePath(
        withLocale(
          locale,
          `/profile/bag/items/${result.definitionId}/${result.itemId}`,
        ),
      );
      revalidatePath(
        withLocale(locale, `/tickets/redeem/${encodeURIComponent(token)}`),
      );
    }
    return result;
  } catch (error) {
    console.error("Failed to redeem inventory ticket", error);
    return { status: "FAILED" };
  }
}
