export type ScraperSource =
  | "sortiraparis"
  | "playinparis"
  | "meetup"
  | "eventbrite"
  | "feverup"
  | "parisfr";

export type ScrapedActivity = {
  id: string;
  source: ScraperSource;
  sourceUrl: string;
  title: string;
  description: string;
  itinerary: string | null;
  type: "PUBLIC_EVENT";
  category:
    | "BOARD_GAME"
    | "MOVIE"
    | "MUSIC"
    | "SPORTS"
    | "TRAVEL"
    | "FOOD"
    | "EXHIBITION"
    | "THEATER"
    | "OTHER";
  city: string;
  destination: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  startAt: string;
  endAt: string | null;
  capacity: number;
  minParticipants: number | null;
  requiresApproval: boolean;
  priceType: "FREE" | "AA" | "FIXED" | "RANGE";
  priceText: string;
  coverImageUrl: string | null;
  status: "RECRUITING";
  visibility: "PUBLIC";
};
