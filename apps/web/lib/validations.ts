import { z } from "zod";

export const nonEmptyString = z.string().trim().min(1, "此项不能为空");
