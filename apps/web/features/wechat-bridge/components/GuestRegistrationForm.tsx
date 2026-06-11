"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, Input, Textarea } from "@chill-club/ui";
import {
  registerGuestForActivityAction,
  type GuestRegistrationState,
} from "../actions/registerGuestForActivity";

type GuestRegistrationFormProps = {
  activityId: string;
  isClosed: boolean;
  isFull: boolean;
  locale: string;
  remainingSeats: number | null;
  shareToken?: string;
};

const initialState: GuestRegistrationState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-busy={pending}
      className="h-12 w-full gap-2 rounded-full bg-[#d88d72] text-base font-semibold text-white shadow-[0_14px_28px_rgba(216,141,114,0.24)] hover:bg-[#c87b61]"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "正在报名" : "我要参加"}
    </Button>
  );
}

export function GuestRegistrationForm({
  activityId,
  isClosed,
  isFull,
  locale,
  remainingSeats,
  shareToken,
}: GuestRegistrationFormProps) {
  const [state, formAction] = useActionState(
    registerGuestForActivityAction,
    initialState,
  );

  if (isClosed) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5">
        <p className="font-semibold text-ink">活动已结束</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          当前活动暂时不能继续报名。
        </p>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5">
        <p className="font-semibold text-amber-900">名额已满</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          当前活动人数已满，请联系发起人确认是否还有候补名额。
        </p>
      </div>
    );
  }

  const attendeeMax = remainingSeats
    ? Math.min(8, Math.max(remainingSeats, 1))
    : 8;
  const seatHint =
    remainingSeats === null
      ? "当前活动暂不限制总名额"
      : `当前还剩 ${remainingSeats} 个名额`;

  return (
    <form action={formAction} className="grid gap-3">
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="shareToken" type="hidden" value={shareToken ?? ""} />

      {state.formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.formError}
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-semibold text-[#7e5f3a]">
        昵称
        <Input
          className="h-11 rounded-xl border-[#ddc9a9] bg-white"
          defaultValue={state.values?.displayName}
          maxLength={30}
          name="displayName"
          placeholder="怎么称呼你"
        />
        {state.fieldErrors?.displayName?.[0] ? (
          <span className="text-xs text-red-600">
            {state.fieldErrors.displayName[0]}
          </span>
        ) : null}
      </label>

      <label className="grid gap-1.5 text-sm font-semibold text-[#7e5f3a]">
        联系方式
        <Input
          className="h-11 rounded-xl border-[#ddc9a9] bg-white"
          defaultValue={state.values?.contact}
          maxLength={80}
          name="contact"
          placeholder="手机号或微信号，方便发起人联系"
        />
        {state.fieldErrors?.contact?.[0] ? (
          <span className="text-xs text-red-600">
            {state.fieldErrors.contact[0]}
          </span>
        ) : null}
      </label>

      <label className="grid gap-1.5 text-sm font-semibold text-[#7e5f3a]">
        <span className="flex items-center justify-between gap-3">
          <span>报名人数</span>
          <span className="text-xs font-medium text-zinc-500">{seatHint}</span>
        </span>
        <Input
          className="h-11 rounded-xl border-[#ddc9a9] bg-white"
          defaultValue={state.values?.attendeeCount ?? "1"}
          inputMode="numeric"
          max={attendeeMax}
          min={1}
          name="attendeeCount"
          type="number"
        />
        {state.fieldErrors?.attendeeCount?.[0] ? (
          <span className="text-xs text-red-600">
            {state.fieldErrors.attendeeCount[0]}
          </span>
        ) : null}
      </label>

      <label className="grid gap-1.5 text-sm font-semibold text-[#7e5f3a]">
        备注
        <Textarea
          className="min-h-24 rounded-xl border-[#ddc9a9] bg-white"
          defaultValue={state.values?.note}
          maxLength={300}
          name="note"
          placeholder="例如：会晚到 10 分钟 / 想和朋友一起"
        />
        {state.fieldErrors?.note?.[0] ? (
          <span className="text-xs text-red-600">
            {state.fieldErrors.note[0]}
          </span>
        ) : null}
      </label>

      <SubmitButton />
      <p className="text-center text-xs leading-5 text-zinc-500">
        报名不需要登录。提交后会生成报名凭证，请保存链接。
      </p>
    </form>
  );
}
