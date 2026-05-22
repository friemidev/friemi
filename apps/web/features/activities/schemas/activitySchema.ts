import { z } from "zod";
import { nonEmptyString } from "@/lib/validations";

export const createActivitySchema = z.object({
  title: nonEmptyString.max(80, "标题最多 80 个字"),
  description: nonEmptyString.max(2000, "描述最多 2000 个字"),
  category: z.enum(["BOARD_GAME", "MOVIE", "MUSIC", "SPORTS", "TRAVEL", "FOOD", "EXHIBITION", "OTHER"]),
  city: nonEmptyString.default("Paris"),
  address: nonEmptyString,
  startAt: nonEmptyString,
  capacity: z.coerce.number().int().min(2).max(100),
  priceText: nonEmptyString
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
