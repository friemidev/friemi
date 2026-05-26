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
  type: true,
  category: true,
  city: true,
  destination: true,
  address: true,
  startAt: true,
  endAt: true,
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
    type: activity.type,
    category: activity.category,
    otherCategoryText: descriptionParts.otherCategoryText,
    city: activity.city,
    destination: activity.destination ?? "",
    address: activity.address,
    startAt: formatParisDateTimeInput(activity.startAt),
    endAt: formatParisDateTimeInput(activity.endAt),
    capacity: String(activity.capacity),
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

  return {
    status: "ok",
    activityId: activity.id,
    values: getEditableActivityValues(activity),
  };
}
