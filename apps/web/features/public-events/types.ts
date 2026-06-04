import type {
  ActivityCategory,
  PriceType,
  PublicEventStatus,
} from "@prisma/client";
import type { ActivityCardViewModel } from "@/features/activities/types";

export type PublicEventCardViewModel = {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  startAt: string;
  endAt: string | null;
  priceType: PriceType;
  priceText: string | null;
  coverImageUrl: string | null;
  officialUrl: string | null;
  status: PublicEventStatus;
  teamCount: number;
  isFavorited?: boolean;
};

export type PublicEventDetailViewModel = PublicEventCardViewModel & {
  teams: ActivityCardViewModel[];
};
