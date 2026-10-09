import { Prisma, type MerchantResidencyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatResidencyDate } from "./validation";

const merchantSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  address: true,
  logoUrl: true,
} as const satisfies Prisma.MerchantSelect;

const summarySelect = (viewerProfileId?: string) =>
  ({
    id: true,
    date: true,
    title: true,
    description: true,
    status: true,
    activityId: true,
    activity: { select: { startAt: true, address: true } },
    requestedByProfileId: true,
    reviewedAt: true,
    rejectionReason: true,
    createdAt: true,
    merchant: { select: merchantSelect },
    _count: {
      select: { signups: { where: { status: "ACTIVE" } } },
    },
    signups: {
      where: {
        profileId: viewerProfileId ?? "__no_viewer__",
      },
      select: { status: true },
    },
  }) as const satisfies Prisma.MerchantResidencySlotSelect;

const detailSelect = {
  id: true,
  date: true,
  title: true,
  description: true,
  status: true,
  activityId: true,
  activity: { select: { startAt: true, address: true } },
  requestedByProfileId: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  merchant: { select: merchantSelect },
  _count: {
    select: { signups: { where: { status: "ACTIVE" } } },
  },
  signups: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      profileId: true,
      status: true,
      createdAt: true,
      cancelledAt: true,
      profile: { select: { nickname: true } },
    },
  },
} as const satisfies Prisma.MerchantResidencySlotSelect;

type SummaryRecord = Prisma.MerchantResidencySlotGetPayload<{
  select: ReturnType<typeof summarySelect>;
}>;
type DetailRecord = Prisma.MerchantResidencySlotGetPayload<{
  select: typeof detailSelect;
}>;
type SummaryBase = Pick<
  SummaryRecord,
  | "id"
  | "date"
  | "title"
  | "description"
  | "status"
  | "activityId"
  | "activity"
  | "requestedByProfileId"
  | "reviewedAt"
  | "rejectionReason"
  | "createdAt"
  | "merchant"
  | "_count"
>;

export type ResidencyMerchant = Prisma.MerchantGetPayload<{
  select: typeof merchantSelect;
}>;

export type ResidencySlotSummary = {
  id: string;
  date: string;
  title: string;
  description: string;
  status: MerchantResidencyStatus;
  signupCount: number;
  viewerSignedUp: boolean;
  viewerHadSignup: boolean;
  viewerRequested: boolean;
  activityId: string | null;
  activity: { startAt: Date; address: string } | null;
  merchant: ResidencyMerchant;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
};

export type ResidencySlotDetail = ResidencySlotSummary & {
  signups: Array<{
    id: string;
    profileId: string;
    nickname: string;
    status: "ACTIVE" | "CANCELLED";
    createdAt: Date;
    cancelledAt: Date | null;
  }>;
};

function toSummary(
  slot: SummaryBase,
  viewerSignedUp = false,
  viewerHadSignup = false,
  viewerProfileId?: string,
): ResidencySlotSummary {
  return {
    id: slot.id,
    date: formatResidencyDate(slot.date),
    title: slot.title,
    description: slot.description,
    status: slot.status,
    signupCount: slot._count.signups,
    viewerSignedUp,
    viewerHadSignup,
    viewerRequested: Boolean(
      viewerProfileId && slot.requestedByProfileId === viewerProfileId,
    ),
    activityId: slot.activityId,
    activity: slot.activity,
    merchant: slot.merchant,
    reviewedAt: slot.reviewedAt,
    rejectionReason: slot.rejectionReason,
    createdAt: slot.createdAt,
  };
}

function toDetail(
  slot: DetailRecord,
  viewerProfileId?: string,
): ResidencySlotDetail {
  return {
    ...toSummary(
      slot,
      slot.signups.some(
        (signup) =>
          signup.profileId === viewerProfileId && signup.status === "ACTIVE",
      ),
      slot.signups.some((signup) => signup.profileId === viewerProfileId),
      viewerProfileId,
    ),
    signups: slot.signups.map((signup) => ({
      id: signup.id,
      profileId: signup.profileId,
      nickname: signup.profile.nickname,
      status: signup.status,
      createdAt: signup.createdAt,
      cancelledAt: signup.cancelledAt,
    })),
  };
}

export async function getOwnerResidencySlots(profileId: string): Promise<{
  merchant: ResidencyMerchant | null;
  slots: ResidencySlotSummary[];
}> {
  const merchant = await prisma.merchant.findFirst({
    where: { ownerProfileId: profileId, isActive: true },
    select: merchantSelect,
  });
  if (!merchant) return { merchant: null, slots: [] };

  const slots = await prisma.merchantResidencySlot.findMany({
    where: { merchantId: merchant.id },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    select: summarySelect(),
  });
  return { merchant, slots: slots.map((slot) => toSummary(slot)) };
}

export async function getOwnerResidencySlot(
  slotId: string,
  profileId: string,
): Promise<ResidencySlotDetail | null> {
  const slot = await prisma.merchantResidencySlot.findFirst({
    where: {
      id: slotId,
      merchant: { isActive: true, ownerProfileId: profileId },
    },
    select: detailSelect,
  });
  return slot ? toDetail(slot, profileId) : null;
}

/** The original applicant keeps access to their request after store ownership changes. */
export async function getRequesterResidencySlot(
  slotId: string,
  profileId: string,
): Promise<ResidencySlotSummary | null> {
  const slot = await prisma.merchantResidencySlot.findFirst({
    where: { id: slotId, requestedByProfileId: profileId },
    select: summarySelect(profileId),
  });
  return slot
    ? toSummary(
        slot,
        slot.signups.some((signup) => signup.status === "ACTIVE"),
        slot.signups.length > 0,
        profileId,
      )
    : null;
}

export async function getAdminResidencySlots(): Promise<
  ResidencySlotSummary[]
> {
  const slots = await prisma.merchantResidencySlot.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: summarySelect(),
  });
  return slots.map((slot) => toSummary(slot));
}

export async function getAdminResidencySlot(
  slotId: string,
): Promise<ResidencySlotDetail | null> {
  const slot = await prisma.merchantResidencySlot.findUnique({
    where: { id: slotId },
    select: detailSelect,
  });
  return slot ? toDetail(slot) : null;
}

export async function getPublicResidencySlots(
  merchantIdOrSlug: string,
  viewerProfileId?: string,
): Promise<ResidencySlotSummary[]> {
  const merchant = await prisma.merchant.findFirst({
    where: {
      isActive: true,
      OR: [{ id: merchantIdOrSlug }, { slug: merchantIdOrSlug }],
    },
    select: { id: true },
  });
  if (!merchant) return [];
  const slots = await prisma.merchantResidencySlot.findMany({
    where: {
      merchantId: merchant.id,
      OR: [
        { status: { in: ["CONFIRMED", "PUBLISHED"] } },
        ...(viewerProfileId
          ? [
              {
                status: "CANCELLED" as const,
                OR: [
                  { signups: { some: { profileId: viewerProfileId } } },
                  { requestedByProfileId: viewerProfileId },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: summarySelect(viewerProfileId),
  });
  return slots.map((slot) =>
    toSummary(
      slot,
      slot.signups.some((signup) => signup.status === "ACTIVE"),
      slot.signups.length > 0,
      viewerProfileId,
    ),
  );
}

export async function getPublicResidencySlot(
  slotId: string,
  viewerProfileId?: string,
): Promise<ResidencySlotSummary | null> {
  const slot = await prisma.merchantResidencySlot.findFirst({
    where: {
      id: slotId,
      OR: [
        {
          status: { in: ["CONFIRMED", "PUBLISHED"] },
          merchant: { isActive: true },
        },
        ...(viewerProfileId
          ? [
              {
                status: {
                  in: ["CONFIRMED", "PUBLISHED"] as MerchantResidencyStatus[],
                },
                merchant: { isActive: false },
                signups: { some: { profileId: viewerProfileId } },
              },
              {
                status: "CANCELLED" as const,
                OR: [
                  { signups: { some: { profileId: viewerProfileId } } },
                  { requestedByProfileId: viewerProfileId },
                ],
              },
            ]
          : []),
      ],
    },
    select: summarySelect(viewerProfileId),
  });
  return slot
    ? toSummary(
        slot,
        slot.signups.some((signup) => signup.status === "ACTIVE"),
        slot.signups.length > 0,
        viewerProfileId,
      )
    : null;
}
