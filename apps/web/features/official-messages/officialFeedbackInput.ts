import { z } from "zod";

export const officialFeedbackSchema = z.object({
  locale: z.enum(["zh-CN", "en", "fr"]).default("zh-CN"),
  content: z.string().trim().min(2).max(2000),
  topic: z.enum(["GENERAL", "CHILD_SAFETY"]).default("GENERAL"),
});

export function formatOfficialFeedback(
  input: z.infer<typeof officialFeedbackSchema>,
) {
  return input.topic === "CHILD_SAFETY"
    ? `[CHILD SAFETY / CSAE / CSAM]\n${input.content}`
    : input.content;
}
