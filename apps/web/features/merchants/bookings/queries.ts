import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BookingRecord,
  BookingSettingsView,
  BookingStatus,
  PublicBookingSpace,
} from "./types";
import { getBookingToday, parseBookingDate } from "./validation";

const merchantSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  address: true,
  logoUrl: true,
  bookingAccessEnabled: true,
} as const satisfies Prisma.MerchantSelect;

const settingsInclude = {
  activity: { select: { title: true, description: true, coverImageUrl: true } },
} as const;
type SettingsRow = Prisma.MerchantBookingSettingsGetPayload<{
  include: typeof settingsInclude;
}>;

const recordSelect = {
  id: true,
  settingsId: true,
  date: true,
  partySize: true,
  contactName: true,
  contactPhone: true,
  note: true,
  status: true,
  rejectionReason: true,
  reviewedAt: true,
  cancelledAt: true,
  createdAt: true,
  profile: { select: { nickname: true } },
  settings: {
    select: { activityId: true, merchant: { select: merchantSelect } },
  },
} as const satisfies Prisma.MerchantBookingReservationSelect;
type RecordRow = Prisma.MerchantBookingReservationGetPayload<{
  select: typeof recordSelect;
}>;

function settingsView(settings: SettingsRow): BookingSettingsView {
  return {
    id: settings.id,
    merchantId: settings.merchantId,
    activityId: settings.activityId,
    enabled: settings.enabled,
    scheduleMode: settings.scheduleMode,
    startDate: settings.startDate.toISOString().slice(0, 10),
    endDate: settings.endDate?.toISOString().slice(0, 10) ?? null,
    weekdays: settings.weekdays,
    specificDates: settings.specificDates.map((date) =>
      date.toISOString().slice(0, 10),
    ),
    closedDates: settings.closedDates.map((date) =>
      date.toISOString().slice(0, 10),
    ),
    title: settings.activity.title,
    description: settings.activity.description,
    coverImageUrl: settings.activity.coverImageUrl,
  };
}

function recordView(record: RecordRow): BookingRecord {
  return {
    id: record.id,
    settingsId: record.settingsId,
    activityId: record.settings.activityId,
    date: record.date.toISOString().slice(0, 10),
    partySize: record.partySize,
    contactName: record.contactName,
    contactPhone: record.contactPhone,
    note: record.note,
    status: record.status,
    rejectionReason: record.rejectionReason,
    reviewedAt: record.reviewedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    merchant: record.settings.merchant,
    customerNickname: record.profile.nickname,
  };
}

export async function getOwnerBookingDashboard(
  profileId: string,
  filters?: { date?: string; status?: BookingStatus },
) {
  const merchant = await prisma.merchant.findFirst({
    where: { ownerProfileId: profileId, owner: { status: "ACTIVE" } },
    select: merchantSelect,
  });
  if (!merchant)
    return { merchant: null, settings: null, bookings: [] as BookingRecord[] };
  const settings = await prisma.merchantBookingSettings.findUnique({
    where: { merchantId: merchant.id },
    include: settingsInclude,
  });
  if (!settings)
    return { merchant, settings: null, bookings: [] as BookingRecord[] };
  const date = filters?.date ? parseBookingDate(filters.date) : null;
  const bookings = await prisma.merchantBookingReservation.findMany({
    where: {
      settingsId: settings.id,
      ...(date ? { date } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: recordSelect,
  });
  return {
    merchant,
    settings: settingsView(settings),
    bookings: bookings.map(recordView),
  };
}

export async function getOwnerBookingRecord(
  profileId: string,
  id: string,
): Promise<BookingRecord | null> {
  const record = await prisma.merchantBookingReservation.findFirst({
    where: {
      id,
      settings: {
        merchant: { ownerProfileId: profileId, owner: { status: "ACTIVE" } },
      },
    },
    select: recordSelect,
  });
  return record ? recordView(record) : null;
}

async function publicBookingSpace(
  where: Prisma.MerchantBookingSettingsWhereInput,
  viewerProfileId?: string,
): Promise<PublicBookingSpace | null> {
  const settings = await prisma.merchantBookingSettings.findFirst({
    where,
    include: {
      activity: {
        select: {
          ...settingsInclude.activity.select,
          status: true,
          visibility: true,
          source: true,
          isPersistent: true,
        },
      },
      merchant: {
        select: {
          ...merchantSelect,
          isActive: true,
          ownerProfileId: true,
          owner: { select: { status: true } },
        },
      },
    },
  });
  if (!settings || settings.activity.visibility !== "PUBLIC") return null;
  const { isActive, ownerProfileId, owner, ...merchant } = settings.merchant;
  const canBook = Boolean(
    isActive &&
    ownerProfileId &&
    owner?.status === "ACTIVE" &&
    merchant.bookingAccessEnabled &&
    settings.enabled &&
    settings.activity.isPersistent &&
    settings.activity.source === "MERCHANT_BOOKING" &&
    settings.activity.status === "RECRUITING",
  );
  const [counts, viewerBookings] = await Promise.all([
    prisma.merchantBookingReservation.groupBy({
      by: ["date"],
      where: {
        settingsId: settings.id,
        status: "ACCEPTED",
        date: { gte: parseBookingDate(getBookingToday())! },
      },
      _sum: { partySize: true },
      orderBy: { date: "asc" },
    }),
    viewerProfileId
      ? prisma.merchantBookingReservation.findMany({
          where: { settingsId: settings.id, profileId: viewerProfileId },
          select: recordSelect,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  return {
    merchant,
    settings: settingsView(settings),
    canBook,
    today: getBookingToday(),
    acceptedCounts: counts.map((count) => ({
      date: count.date.toISOString().slice(0, 10),
      people: count._sum.partySize ?? 0,
    })),
    viewerBookings: viewerBookings.map(recordView),
  };
}

export function getPublicBookingSpaceByActivity(
  activityId: string,
  viewerProfileId?: string,
) {
  return publicBookingSpace({ activityId }, viewerProfileId);
}

export function getMerchantBookingSpace(
  merchantId: string,
  viewerProfileId?: string,
) {
  return publicBookingSpace(
    { merchant: { OR: [{ id: merchantId }, { slug: merchantId }] } },
    viewerProfileId,
  );
}

export async function getViewerBookings(
  profileId: string,
): Promise<BookingRecord[]> {
  const bookings = await prisma.merchantBookingReservation.findMany({
    where: { profileId },
    select: recordSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return bookings.map(recordView);
}

export async function getViewerBooking(
  profileId: string,
  id: string,
): Promise<BookingRecord | null> {
  const booking = await prisma.merchantBookingReservation.findFirst({
    where: { id, profileId },
    select: recordSelect,
  });
  return booking ? recordView(booking) : null;
}
