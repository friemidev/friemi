import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatParisDateTimeInput,
  splitStoredDescription,
  type ActivityFormValues,
} from "../actions/activityActionUtils";

const editableActivitySelect = {
  id: true,
  title: true,
  description: true,
  itinerary: true,
  coverImageUrl: true,
  type: true,
  category: true,
  visibility: true,
  city: true,
  destination: true,
  address: true,
  latitude: true,
  longitude: true,
  startAt: true,
  endAt: true,
  status: true,
  capacity: true,
  minParticipants: true,
  requiresApproval: true,
  priceType: true,
  priceText: true,
  organizerId: true,
} satisfies Prisma.ActivitySelect;

type EditableActivityQueryResult = Prisma.ActivityGetPayload<{
  select: typeof editableActivitySelect;
}>;

export type EditableActivityResult =
  | {
      status: "ok";
      activityId: string;
      values: ActivityFormValues;
    }
  | {
      status: "forbidden";
    }
  | {
      status: "locked";
    }
  | {
      status: "not-found";
    };

function getEditableActivityValues(
  activity: EditableActivityQueryResult,
): ActivityFormValues {
  const descriptionParts = splitStoredDescription(
    activity.category,
    activity.description,
  );

  return {
    title: activity.title,
    description: descriptionParts.description,
    itinerary: activity.itinerary ?? "",
    coverImageUrl: activity.coverImageUrl ?? "",
    type: activity.type,
    category: activity.category,
    visibility: activity.visibility,
    otherCategoryText: descriptionParts.otherCategoryText,
    city: activity.city,
    destination: activity.destination ?? "",
    address: activity.address,
    latitude: activity.latitude === null ? "" : String(activity.latitude),
    longitude: activity.longitude === null ? "" : String(activity.longitude),
    startAt: formatParisDateTimeInput(activity.startAt),
    endAt: formatParisDateTimeInput(activity.endAt),
    capacity: String(activity.capacity),
    capacityLimitEnabled: activity.capacity > 0,
    minParticipants: activity.minParticipants
      ? String(activity.minParticipants)
      : "",
    requiresApproval: activity.requiresApproval,
    priceType: activity.priceType,
    priceText: activity.priceText,
  };
}

export async function getEditableActivityById(
  activityId: string,
  organizerId: string,
): Promise<EditableActivityResult> {
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: editableActivitySelect,
  });

  if (!activity) {
    return {
      status: "not-found",
    };
  }

  if (activity.organizerId !== organizerId) {
    return {
      status: "forbidden",
    };
  }

  if (
    activity.status === "CANCELLED" ||
    activity.status === "ENDED" ||
    (activity.endAt ?? activity.startAt) <= new Date()
  ) {
    return {
      status: "locked",
    };
  }

  return {
    status: "ok",
    activityId: activity.id,
    values: getEditableActivityValues(activity),
  };
}
