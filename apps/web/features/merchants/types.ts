import type { ActivityCardViewModel } from "@/features/activities/types";

export type MerchantProfileViewModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  totalActivityCount: number;
  upcomingActivityCount: number;
  activities: ActivityCardViewModel[];
};
