export type ActivityScheduleValidationResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      field: "startAt" | "endAt";
      fieldMessage: string;
    };

export function validateActivitySchedule({
  startAt,
  endAt,
  now = new Date(),
}: {
  startAt: Date;
  endAt: Date | null;
  now?: Date;
}): ActivityScheduleValidationResult {
  if (endAt) {
    if (endAt <= now) {
      return {
        ok: false,
        field: "endAt",
        message: "结束时间必须晚于当前时间。",
        fieldMessage: "请选择未来的结束时间",
      };
    }

    if (endAt <= startAt) {
      return {
        ok: false,
        field: "endAt",
        message: "结束时间必须晚于开始时间。",
        fieldMessage: "结束时间必须晚于开始时间",
      };
    }

    return { ok: true };
  }

  if (startAt < now) {
    return {
      ok: false,
      field: "startAt",
      message: "开始时间不能早于当前时间。",
      fieldMessage: "请选择未来的开始时间",
    };
  }

  return { ok: true };
}
