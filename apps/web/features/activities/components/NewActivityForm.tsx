"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@chill-club/ui";
import {
  activityCategories,
  activityTypes,
  priceTypes,
} from "@chill-club/shared";
import {
  createActivityAction,
  type CreateActivityState,
} from "../actions/createActivity";

type NewActivityFormProps = {
  locale: string;
};

const initialState: CreateActivityState = {};
const categoryOptions = Object.entries(activityCategories).sort(
  ([left], [right]) => {
    if (left === "OTHER") {
      return 1;
    }

    if (right === "OTHER") {
      return -1;
    }

    return 0;
  },
);
const selectClassName =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400";

function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={
        className ? `${selectClassName} ${className}` : selectClassName
      }
      {...props}
    />
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="text-xs font-medium text-red-600">{errors[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? "创建中..." : "创建活动"}
    </Button>
  );
}

export function NewActivityForm({ locale }: NewActivityFormProps) {
  const [state, formAction] = useActionState(
    createActivityAction,
    initialState,
  );
  const values = state.values;
  const [activityType, setActivityType] = useState(values?.type ?? "LOCAL");
  const [category, setCategory] = useState(values?.category ?? "BOARD_GAME");

  return (
    <Card>
      <CardHeader>
        <CardTitle>基础信息</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          key={state.version ?? 0}
          action={formAction}
          className="grid gap-6"
          noValidate
        >
          <input name="locale" type="hidden" value={locale} />

          {state.formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.formError}
            </div>
          ) : null}

          <FormSection title="活动内容">
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              标题
              <Input
                name="title"
                defaultValue={values?.title}
                placeholder="例如：周五下班后桌游局"
                required
              />
              <FieldError errors={state.fieldErrors?.title} />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              描述
              <Textarea
                name="description"
                defaultValue={values?.description}
                placeholder="介绍活动内容、适合人群、注意事项"
                required
              />
              <FieldError errors={state.fieldErrors?.description} />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              行程
              <Textarea
                name="itinerary"
                defaultValue={values?.itinerary}
                placeholder={"18:30 集合\n19:00 开始活动\n21:30 自由交流"}
              />
              <FieldError errors={state.fieldErrors?.itinerary} />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                活动形式
                <Select
                  name="type"
                  onChange={(event) => setActivityType(event.target.value)}
                  required
                  value={activityType}
                >
                  <option value="LOCAL">{activityTypes.LOCAL}</option>
                  <option value="TRIP">{activityTypes.TRIP}</option>
                </Select>
                <span className="text-xs font-normal text-zinc-500">
                  本地活动或旅行搭子，创建后会影响列表标签。
                </span>
                <FieldError errors={state.fieldErrors?.type} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                活动主题
                <Select
                  name="category"
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  value={category}
                >
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <span className="text-xs font-normal text-zinc-500">
                  优先选择平台预设主题；没有合适选项时选“其他”。
                </span>
                <FieldError errors={state.fieldErrors?.category} />
              </label>
            </div>

            {category === "OTHER" ? (
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                其他主题
                <Input
                  name="otherCategoryText"
                  defaultValue={values?.otherCategoryText}
                  maxLength={40}
                  placeholder="例如：读书会、语言交换、摄影约拍"
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  会保存到活动说明中，方便参与者理解活动内容。
                </span>
                <FieldError errors={state.fieldErrors?.otherCategoryText} />
              </label>
            ) : null}
          </FormSection>

          <FormSection title="时间和地点">
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              城市
              <Input
                name="city"
                defaultValue={values?.city ?? "Paris"}
                required
              />
              <FieldError errors={state.fieldErrors?.city} />
            </label>

            {activityType === "TRIP" ? (
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                目的地
                <Input
                  name="destination"
                  defaultValue={values?.destination}
                  placeholder="例如：Nice / Amsterdam / London"
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  旅行搭子需要填写目的地，方便用户判断是否感兴趣。
                </span>
                <FieldError errors={state.fieldErrors?.destination} />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              地址
              <Input
                name="address"
                defaultValue={values?.address}
                placeholder="République, Paris"
                required
              />
              <FieldError errors={state.fieldErrors?.address} />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                开始时间
                <Input
                  name="startAt"
                  defaultValue={values?.startAt}
                  type="datetime-local"
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  按巴黎时间保存，需晚于当前时间。
                </span>
                <FieldError errors={state.fieldErrors?.startAt} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                结束时间
                <Input
                  name="endAt"
                  defaultValue={values?.endAt}
                  type="datetime-local"
                />
                <span className="text-xs font-normal text-zinc-500">
                  可选；填写时必须晚于开始时间。
                </span>
                <FieldError errors={state.fieldErrors?.endAt} />
              </label>
            </div>
          </FormSection>

          <FormSection title="人数和费用">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                人数上限
                <Input
                  name="capacity"
                  type="number"
                  min={2}
                  max={100}
                  defaultValue={values?.capacity ?? 6}
                  required
                />
                <FieldError errors={state.fieldErrors?.capacity} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                最少成团人数
                <Input
                  name="minParticipants"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={values?.minParticipants}
                  placeholder="例如：4"
                />
                <FieldError errors={state.fieldErrors?.minParticipants} />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                费用类型
                <Select
                  name="priceType"
                  defaultValue={values?.priceType}
                  required
                >
                  {Object.entries(priceTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <FieldError errors={state.fieldErrors?.priceType} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                费用说明
                <Input
                  name="priceText"
                  defaultValue={values?.priceText}
                  placeholder="免费 / AA 预计 10 欧 / 门票自理"
                  required
                />
                <FieldError errors={state.fieldErrors?.priceText} />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              <input
                className="mt-1"
                name="requiresApproval"
                type="checkbox"
                defaultChecked={values?.requiresApproval}
              />
              <span>
                <span className="font-medium text-ink">报名需要审核</span>
                <span className="mt-1 block text-zinc-500">
                  开启后，用户报名后需要发起人确认。
                </span>
              </span>
            </label>
          </FormSection>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
