import type {
  ActivityStatus,
  MerchantResidencySignupStatus,
  MerchantResidencyStatus,
  ParticipantStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatResidencyDate, getParisDateString } from "./validation";

export type ViewerBooking = {
  id: string;
  slotId: string;
  date: string;
  title: string;
  merchant: {
    id: string;
    name: string;
    isActive: boolean;
  };
  activityId: string | null;
  state: "CONFIRMED" | "PUBLISHED" | "SIGNUP_CANCELLED" | "BOOKING_CANCELLED";
};

export function isUpcomingViewerBooking(
  booking: ViewerBooking,
  today = getParisDateString(),
) {
  return (
    booking.date >= today &&
    (booking.state === "CONFIRMED" || booking.state === "PUBLISHED")
  );
}

export function getViewerBookingState(input: {
  activityStatus: ActivityStatus | null;
  participationStatus: ParticipantStatus | null;
  signupStatus: MerchantResidencySignupStatus;
  slotStatus: MerchantResidencyStatus;
}): ViewerBooking["state"] {
  if (
    input.slotStatus === "CANCELLED" ||
    input.activityStatus === "CANCELLED"
  ) {
    return "BOOKING_CANCELLED";
  }
  if (
    input.signupStatus === "CANCELLED" ||
    input.participationStatus === "CANCELLED"
  ) {
    return "SIGNUP_CANCELLED";
  }
  return input.slotStatus === "PUBLISHED" ? "PUBLISHED" : "CONFIRMED";
}

export async function getViewerBookings(profileId: string): Promise<{
  upcoming: ViewerBooking[];
  history: ViewerBooking[];
}> {
  const signups = await prisma.merchantResidencySignup.findMany({
    where: { profileId },
    orderBy: [{ slot: { date: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      status: true,
      slot: {
        select: {
          id: true,
          date: true,
          title: true,
          status: true,
          activityId: true,
          merchant: {
            select: { id: true, name: true, isActive: true },
          },
          activity: {
            select: {
              status: true,
              participants: {
                where: { userProfileId: profileId },
                select: { status: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const bookings = signups.map((signup): ViewerBooking => {
    const { slot } = signup;
    const activityParticipation = slot.activity?.participants[0];
    const state = getViewerBookingState({
      activityStatus: slot.activity?.status ?? null,
      participationStatus: activityParticipation?.status ?? null,
      signupStatus: signup.status,
      slotStatus: slot.status,
    });

    return {
      id: signup.id,
      slotId: slot.id,
      date: formatResidencyDate(slot.date),
      title: slot.title,
      merchant: slot.merchant,
      activityId: slot.activityId,
      state,
    };
  });

  const today = getParisDateString();
  return {
    upcoming: bookings.filter((booking) =>
      isUpcomingViewerBooking(booking, today),
    ),
    history: bookings
      .filter((booking) => !isUpcomingViewerBooking(booking, today))
      .reverse(),
  };
}
