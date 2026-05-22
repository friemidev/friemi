"use server";

import { createActivitySchema } from "../schemas/activitySchema";

export async function createActivityPlaceholder(formData: FormData) {
  const parsed = createActivitySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors
    };
  }

  return {
    ok: true,
    data: parsed.data
  };
}
