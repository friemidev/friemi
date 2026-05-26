import { prisma } from "@/lib/prisma";
import type { ActivityCardViewModel } from "../types";
import {
  activityCardSelect,
  getActivityCardViewModel,
  getVisibleActivityWhere
} from "./getActivities";

export async function getActivityById(activityId: string): Promise<ActivityCardViewModel | null> {
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      ...getVisibleActivityWhere()
    },
    select: activityCardSelect
  });

  return activity ? getActivityCardViewModel(activity) : null;
}
