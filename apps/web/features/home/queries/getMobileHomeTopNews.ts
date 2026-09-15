import {
  getMobileHomeTopNewsConfigItems,
  type MobileHomeTopNewsItem,
} from "@/features/home/topNewsConfig";

export type { MobileHomeTopNewsItem } from "@/features/home/topNewsConfig";

export async function getMobileHomeTopNewsItems(locale: string) {
  return getMobileHomeTopNewsConfigItems(locale);
}
