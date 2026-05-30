import { z } from "zod";
import { activityCategories, priceTypes } from "@chill-club/shared";
import { clampActivityDescription } from "@/lib/activity-description";
import { nonEmptyString } from "@/lib/validations";

export const MAX_ACTIVITY_DESCRIPTION_LENGTH = 3000;

const createActivityTypes = ["LOCAL", "TRIP"] as const;
const activityCategoryValues = Object.keys(activityCategories) as [
  keyof typeof activityCategories,
  ...(keyof typeof activityCategories)[],
];
const priceTypeValues = Object.keys(priceTypes) as [
  keyof typeof priceTypes,
  ...(keyof typeof priceTypes)[],
];

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));
const optionalShortText = z
  .string()
  .trim()
  .max(40, "最多 40 个字")
  .transform((value) => (value.length > 0 ? value : null));
const optionalImageUrl = z
  .string()
  .trim()
  .max(1000, "图片地址过长")
  .refine(
    (value) => value.length === 0 || /^https?:\/\/.+/i.test(value),
    "图片地址无效",
  )
  .transform((value) => (value.length > 0 ? value : null));
const optionalNumber = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce
    .number()
    .int("请输入整数")
    .min(1, "最少成团人数至少为 1 人")
    .max(100, "最少成团人数最多为 100 人")
    .optional(),
);
const optionalCoordinate = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce.number().min(min, message).max(max, message).optional(),
  );

export const createActivitySchema = z
  .object({
    title: nonEmptyString.max(80, "标题最多 80 个字"),
    description: z.preprocess(
      (value) =>
        typeof value === "string"
          ? clampActivityDescription(value, MAX_ACTIVITY_DESCRIPTION_LENGTH)
          : value,
      nonEmptyString.max(
        MAX_ACTIVITY_DESCRIPTION_LENGTH,
        `描述最多 ${MAX_ACTIVITY_DESCRIPTION_LENGTH} 个字`,
      ),
    ),
    itinerary: optionalText,
    coverImageUrl: optionalImageUrl,
    type: z.enum(createActivityTypes),
    category: z.enum(activityCategoryValues),
    otherCategoryText: optionalShortText,
    city: nonEmptyString.default("Paris"),
    destination: optionalText,
    address: nonEmptyString,
    latitude: optionalCoordinate(-90, 90, "纬度必须在 -90 到 90 之间"),
    longitude: optionalCoordinate(-180, 180, "经度必须在 -180 到 180 之间"),
    startAt: nonEmptyString,
    endAt: optionalText,
    capacity: z.coerce
      .number()
      .int("请输入整数")
      .min(2, "人数上限至少为 2 人")
      .max(100, "人数上限最多为 100 人"),
    minParticipants: optionalNumber,
    requiresApproval: z.coerce.boolean().default(false),
    priceType: z.enum(priceTypeValues),
    priceText: nonEmptyString.max(120, "费用说明最多 120 个字"),
  })
  .superRefine((value, ctx) => {
    if (value.category === "OTHER" && !value.otherCategoryText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "选择其他时，请填写具体主题",
        path: ["otherCategoryText"],
      });
    }

    if (value.type === "TRIP" && !value.destination) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "旅行搭子需要填写目的地",
        path: ["destination"],
      });
    }

    if (value.minParticipants && value.minParticipants > value.capacity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "最少成团人数不能大于人数上限",
        path: ["minParticipants"],
      });
    }

    if ((value.latitude === undefined) !== (value.longitude === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "请选择完整地点坐标",
        path: ["latitude"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "请选择完整地点坐标",
        path: ["longitude"],
      });
    }
  });

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
