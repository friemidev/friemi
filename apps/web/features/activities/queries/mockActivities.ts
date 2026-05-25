import type { ActivityCardViewModel } from "../types";

export const mockActivities: ActivityCardViewModel[] = [
  {
    id: "board-game-friday",
    title: "周五下班后桌游局",
    description: "轻松认识新朋友，适合第一次参加活动的人。",
    category: "BOARD_GAME",
    city: "Paris",
    address: "République, Paris",
    startAt: "2026-06-05T18:30:00.000Z",
    capacity: 8,
    participantCount: 5,
    priceText: "AA 预计 8-12 欧",
    status: "RECRUITING",
    coverTone: "moss"
  },
  {
    id: "orsay-weekend",
    title: "奥赛博物馆周末看展",
    description: "一起看展，结束后附近喝咖啡。",
    category: "EXHIBITION",
    city: "Paris",
    address: "Musée d'Orsay",
    startAt: "2026-06-07T13:00:00.000Z",
    capacity: 6,
    participantCount: 6,
    priceText: "门票自理",
    status: "CONFIRMED",
    coverTone: "clay"
  },
  {
    id: "paris-city-walk",
    title: "巴黎 City Walk 摄影小队",
    description: "从玛黑区走到塞纳河边，适合拍照和聊天。",
    category: "TRAVEL",
    city: "Paris",
    address: "Le Marais",
    startAt: "2026-06-14T09:00:00.000Z",
    capacity: 10,
    participantCount: 3,
    priceText: "免费",
    status: "RECRUITING",
    coverTone: "sky"
  }
];

export function getMockActivity(activityId: string) {
  return mockActivities.find((activity) => activity.id === activityId) ?? mockActivities[0];
}
