"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActivityAaLedger } from "../server/ledgerService";
import { encodePaymentMethods } from "../domain/paymentMethods";

const paymentMethodSchema = z.array(z.string()).max(8);

export async function saveAaPaymentMethod(
  activityId: string,
  locale: string,
  rawValues: string[],
): Promise<{ paymentMethod?: string | null; error?: "INVALID" | "FORBIDDEN" | "FAILED" }> {
  if (!activityId || activityId.length > 120 || !["zh-CN", "en", "fr"].includes(locale)) {
    return { error: "INVALID" };
  }
  const parsed = paymentMethodSchema.safeParse(rawValues);
  if (!parsed.success) return { error: "INVALID" };
  let stored: string | null;
  try { stored = encodePaymentMethods(parsed.data); }
  catch { return { error: "INVALID" }; }
  const isRemoving = stored === null;

  const profile = await getCurrentUserProfileForMutation(locale, `/lobby/${activityId}/aa/progress`);
  try {
    await ensureActivityAaLedger(activityId, profile.id);
    const updated = await prisma.aaParticipant.updateMany({
      where: {
        userProfileId: profile.id,
        ...(isRemoving ? {} : { status: "ACTIVE" as const }),
        ledger: isRemoving ? { activityId } : { activityId, status: { not: "ARCHIVED" } },
      },
      data: { paymentMethod: stored },
    });
    if (updated.count !== 1) return { error: "FORBIDDEN" };
    revalidatePath(`/${locale}/lobby/${activityId}/aa`, "layout");
    return { paymentMethod: stored };
  } catch {
    return { error: "FAILED" };
  }
}
