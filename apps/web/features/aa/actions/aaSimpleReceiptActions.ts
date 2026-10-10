"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maxImageBucketFileSize } from "@/lib/image-upload-policy";
import { AA_EXPENSE } from "../domain/simpleLedger";
import { getActivityAaAccess } from "../server/access";
import { uploadAaReceipt } from "../server/receiptStorage";

export async function uploadSimpleAaReceipt(activityId: string, locale: string, recordId: string, formData: FormData) {
  const file = formData.get("receipt");
  if (!(file instanceof File) || !file.size || file.size > maxImageBucketFileSize || !file.type.startsWith("image/")) return { error: "INVALID_FILE" };
  const profile = await getCurrentUserProfileForMutation(locale, `/lobby/${activityId}/aa/transactions/${recordId}`);
  const [record, access] = await Promise.all([
    prisma.aaTransaction.findFirst({ where: { id: recordId, ledger: { activityId } }, include: { ledger: { include: { participants: true } }, contributions: true, shares: true } }),
    getActivityAaAccess(activityId, profile.id),
  ]);
  const viewer = record?.ledger.participants.find(person => person.userProfileId === profile.id);
  if (!record || !access || !viewer || record.importSource !== AA_EXPENSE || record.status !== "POSTED" || record.ledger.status === "ARCHIVED" ||
    !(access.canManage || record.creatorParticipantId === viewer.id || record.contributions.some(item => item.participantId === viewer.id) || record.shares.some(item => item.participantId === viewer.id))) {
    return { error: "FORBIDDEN" };
  }
  const uploaded = await uploadAaReceipt({ file, ledgerId: record.ledgerId, participantId: viewer.id, transactionId: recordId });
  if (uploaded.status !== "READY") return { error: "UPLOAD_FAILED" };
  const attachment = await prisma.aaAttachment.create({ data: {
    byteSize: uploaded.byteSize, fileName: uploaded.fileName, mimeType: uploaded.mimeType,
    objectKey: uploaded.objectKey, status: uploaded.status, transactionId: recordId, uploaderParticipantId: viewer.id,
  } });
  await prisma.aaAuditEvent.create({ data: {
    action: "ATTACH_RECEIPT", actorParticipantId: viewer.id, after: { status: "READY" },
    entityId: attachment.id, entityType: "ATTACHMENT", ledgerId: record.ledgerId, transactionId: recordId,
  } });
  revalidatePath(`/${locale}/lobby/${activityId}/aa`, "layout");
  return { attachment: { id: attachment.id, fileName: attachment.fileName, status: attachment.status } };
}
