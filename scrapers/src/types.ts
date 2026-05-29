export type SourceName = "sortiraparis" | "playinparis";

export type ActivityCategory =
  | "BOARD_GAME"
  | "MOVIE"
  | "MUSIC"
  | "SPORTS"
  | "TRAVEL"
  | "FOOD"
  | "EXHIBITION"
  | "OTHER";

export type ActivityType = "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP";
export type PriceType = "FREE" | "AA" | "FIXED" | "RANGE";
export type ActivityStatus = "OPEN" | "FULL" | "DRAFT" | "RECRUITING" | "CONFIRMED" | "ENDED" | "CANCELLED";
export type ActivityVisibility = "PUBLIC" | "LINK_ONLY" | "PRIVATE";

export type NormalizedActivity = {
  id: string;
  source: SourceName;
  sourceUrl: string;
  title: string;
  description: string;
  itinerary?: string | null;
  type: ActivityType;
  category: ActivityCategory;
  city: string;
  destination?: string | null;
  address: string;
  startAt: Date;
  endAt?: Date | null;
  capacity: number;
  minParticipants?: number | null;
  requiresApproval: boolean;
  priceType: PriceType;
  priceText: string;
  coverImageUrl?: string | null;
  status: ActivityStatus;
  visibility: ActivityVisibility;
};

export type ScrapeSummary = {
  source: SourceName;
  count: number;
  activities: NormalizedActivity[];
};
