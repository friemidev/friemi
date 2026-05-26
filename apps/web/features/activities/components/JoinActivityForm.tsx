"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Textarea } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import {
  joinActivityAction,
  type JoinActivityState,
} from "../actions/joinActivity";
import { CancelParticipationForm } from "./CancelParticipationForm";

type ViewerParticipationStatus =
  | "JOINED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | null;

type JoinActivityFormProps = {
  activityId: string;
  locale: string;
  requiresApproval: boolean;
  isFull: boolean;
  isClosed: boolean;
  isOrganizer: boolean;
  isAuthenticated: boolean;
  viewerParticipationStatus: ViewerParticipationStatus;
};

const initialState: JoinActivityState = {};

function SubmitButton({ requiresApproval }: { requiresApproval: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "提交中..." : requiresApproval ? "提交报名申请" : "立即报名"}
    </Button>
  );
}

function DisabledAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function getParticipationCopy(
  status: Exclude<ViewerParticipationStatus, null>,
) {
  if (status === "PENDING") {
    return {
      title: "报名申请已提交",
      description: "这个活动需要发起人审核，通过后会计入报名人数。",
    };
  }

  return {
    title: "你已报名",
    description: "你已经在这个活动的参与名单中。",
  };
}

function RejoinNotice({ status }: { status: "REJECTED" | "CANCELLED" }) {
  const copy =
    status === "REJECTED"
      ? {
          title: "报名未通过",
          description: "如需重新沟通，可以修改留言后再次提交报名。",
        }
      : {
          title: "你已取消报名",
          description: "如计划有变，也可以重新提交报名。",
        };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
      <p className="font-medium text-amber-900">{copy.title}</p>
      <p className="mt-1 leading-6 text-amber-800">{copy.description}</p>
    </div>
  );
}

export function JoinActivityForm({
  activityId,
  locale,
  requiresApproval,
  isFull,
  isClosed,
  isOrganizer,
  isAuthenticated,
  viewerParticipationStatus,
}: JoinActivityFormProps) {
  const [state, formAction] = useActionState(joinActivityAction, initialState);

  if (
    viewerParticipationStatus &&
    viewerParticipationStatus !== "REJECTED" &&
    viewerParticipationStatus !== "CANCELLED"
  ) {
    const copy = getParticipationCopy(viewerParticipationStatus);

    return (
      <div className="grid gap-3">
        <DisabledAction title={copy.title} description={copy.description} />
        <CancelParticipationForm activityId={activityId} locale={locale} />
      </div>
    );
  }

  if (isClosed) {
    return (
      <DisabledAction
        title="活动已结束"
        description="这个活动已经结束或暂不可报名。"
      />
    );
  }

  if (isFull) {
    return (
      <DisabledAction
        title="名额已满"
        description="当前活动名额已满，不能继续报名。"
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid gap-3">
        <DisabledAction
          title="登录后报名"
          description="登录后可以提交报名，并让发起人看到你的报名信息。"
        />
        <Link
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          href={withLocale(locale, "/sign-in")}
        >
          登录后报名
        </Link>
      </div>
    );
  }

  if (isOrganizer) {
    return (
      <DisabledAction
        title="你是活动发起人"
        description="发起人不需要报名自己的活动。"
      />
    );
  }

  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {viewerParticipationStatus === "REJECTED" ||
      viewerParticipationStatus === "CANCELLED" ? (
        <RejoinNotice status={viewerParticipationStatus} />
      ) : null}

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        报名留言
        <Textarea
          className="min-h-24"
          name="message"
          defaultValue={state.values?.message}
          maxLength={300}
          placeholder="简单介绍一下你想参加的原因，可选"
        />
        <span className="text-xs font-normal text-zinc-500">
          {requiresApproval
            ? "发起人会看到这段留言，用于判断是否通过报名。"
            : "留言会随报名记录保存，方便发起人了解你。"}
        </span>
        {state.fieldErrors?.message?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.message[0]}
          </span>
        ) : null}
      </label>

      <SubmitButton requiresApproval={requiresApproval} />
    </form>
  );
}
