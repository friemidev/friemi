import type { ActivityCategory, PriceType } from "./types.js";

export function guessCategory(text: string): ActivityCategory {
  const value = text.toLowerCase();
  if (/(桌游|board\s*game|jenga|狼人杀|卡牌)/i.test(value)) return "BOARD_GAME";
  if (/(电影|cinema|movie|film)/i.test(value)) return "MOVIE";
  if (/(音乐|concert|live|dj|k-pop|kpop|festival|show|opera)/i.test(value)) return "MUSIC";
  if (/(运动|sport|run|fitness|yoga|tennis|足球|篮球|游泳)/i.test(value)) return "SPORTS";
  if (/(旅行|walk|city\s*walk|tour|travel|hike|voyage|漫步|散步)/i.test(value)) return "TRAVEL";
  if (/(美食|food|wine|drink|restaurant|café|cafe|brunch|dinner|cooking|餐|吃)/i.test(value)) return "FOOD";
  if (/(展|exhibition|museum|gallery|art|博物馆|艺术)/i.test(value)) return "EXHIBITION";
  return "OTHER";
}

export function guessPriceType(priceText: string): PriceType {
  const value = priceText.toLowerCase();
  if (!value || /free|免费|0\s*€|0\s*eur|gratuit/.test(value)) return "FREE";
  if (/aa|split|各自|均摊/.test(value)) return "AA";
  if (/\d+\s*[-~至到]\s*\d+/.test(value)) return "RANGE";
  return "FIXED";
}