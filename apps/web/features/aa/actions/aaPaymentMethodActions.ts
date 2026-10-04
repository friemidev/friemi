"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActivityAaLedger } from "../server/ledgerService";

const paymentMethodSchema = z.string().trim().max(160);

export async function saveAaPaymentMethod(
  activityId: string,
  locale: string,
  rawValue: string,
): Promise<{ paymentMethod?: string | null; error?: "INVALID" | "FORBIDDEN" | "FAILED" }> {
  if (!activityId || activityId.length > 120 || !["zh-CN", "en", "fr"].includes(locale)) {
    return { error: "INVALID" };
  }
  const parsed = paymentMethodSchema.safeParse(rawValue);
  if (!parsed.success || /[\u0000-\u001f\u007f]/.test(parsed.data)) return { error: "INVALID" };
  const isRemoving = parsed.data.length === 0;

  const profile = await getCurrentUserProfileForMutation(locale, `/lobby/${activityId}/aa/progress`);
  try {
    await ensureActivityAaLedger(activityId, profile.id);
    const updated = await prisma.aaParticipant.updateMany({
      where: {
        userProfileId: profile.id,
        ...(isRemoving ? {} : { status: "ACTIVE" as const }),
        ledger: isRemoving ? { activityId } : { activityId, status: { not: "ARCHIVED" } },
      },
      data: { paymentMethod: parsed.data || null },
    });
    if (updated.count !== 1) return { error: "FORBIDDEN" };
    revalidatePath(`/${locale}/lobby/${activityId}/aa`, "layout");
    return { paymentMethod: parsed.data || null };
  } catch {
    return { error: "FAILED" };
  }
}
