import type {
  activityCategories,
  activityStatuses,
  activityTypes,
  priceTypes,
  visibilityTypes,
} from "../constants/activities";

export type ActivityType = keyof typeof activityTypes;
export type ActivityCategory = keyof typeof activityCategories;
export type ActivityStatus = keyof typeof activityStatuses;
export type PriceType = keyof typeof priceTypes;
export type VisibilityType = keyof typeof visibilityTypes;

export type ActivitySummary = {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  category: ActivityCategory;
  city: string;
  address: string;
  startAt: string;
  endAt: string | null;
  capacity: number;
  participantCount: number;
  priceText: string;
  status: ActivityStatus;
};
