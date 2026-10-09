export type BookingScheduleMode = "DAILY" | "WEEKLY" | "DATES";
export type BookingStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export type BookingMerchant = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  logoUrl: string | null;
};

export type BookingSettingsView = {
  id: string;
  merchantId: string;
  activityId: string;
  enabled: boolean;
  scheduleMode: BookingScheduleMode;
  startDate: string;
  endDate: string | null;
  weekdays: number[];
  specificDates: string[];
  closedDates: string[];
  title: string;
  description: string;
  coverImageUrl: string | null;
};

/** Only return this personal record to its customer or the current store owner. */
export type BookingRecord = {
  id: string;
  settingsId: string;
  activityId: string;
  date: string;
  partySize: number;
  contactName: string;
  contactPhone: string;
  note: string | null;
  status: BookingStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  merchant: BookingMerchant;
  customerNickname: string;
};

export type PublicBookingSpace = {
  merchant: BookingMerchant;
  settings: BookingSettingsView;
  canBook: boolean;
  today: string;
  acceptedCounts: Array<{ date: string; people: number }>;
  viewerBookings: BookingRecord[];
};

export type BookingActionState = {
  success?: boolean;
  alreadyBooked?: boolean;
  error?: string;
  bookingId?: string;
  activityId?: string;
};
