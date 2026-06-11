import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { getPublicRegistrationReceipt } from "@/features/wechat-bridge/queries/getPublicRegistrationActivity";
import { withLocale } from "@/lib/routes";

type RegistrationReceiptPageProps = {
  params: Promise<{
    locale: string;
    registrationToken: string;
  }>;
};

export const dynamic = "force-dynamic";

function formatDateRange({
  endAt,
  locale,
  startAt,
}: {
  endAt: string | null;
  locale: string;
  startAt: string;
}) {
  const dateLocale =
    locale === "zh-CN" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US";
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const dateFormatter = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
  });

  return end
    ? `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`
    : dateFormatter.format(start);
}

function getReceiptCode(id: string) {
  return `NFC-${id.slice(-6).toUpperCase()}`;
}

export default async function RegistrationReceiptPage({
  params,
}: RegistrationReceiptPageProps) {
  const { locale, registrationToken } = await params;
  const receipt = await getPublicRegistrationReceipt(registrationToken);

  if (!receipt) {
    notFound();
  }

  const dateLabel = formatDateRange({
    endAt: receipt.activity.endAt,
    locale,
    startAt: receipt.activity.startAt,
  });
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const publicActivityPath = withLocale(locale, `/e/${receipt.activity.id}`);
  const publicActivityUrl = host
    ? `${protocol}://${host}${publicActivityPath}`
    : publicActivityPath;
  const receiptCode = getReceiptCode(receipt.id);
  const shareText = [
    `我已报名：${receipt.activity.title}`,
    `报名人：${receipt.displayName}`,
    `人数：${receipt.attendeeCount}`,
    `时间：${dateLabel}`,
    `地点：${receipt.activity.address}`,
    `报名凭证：${receiptCode}`,
    `活动报名：${publicActivityUrl}`,
  ].join("\n");

  return (
    <PageContainer className="py-5 sm:py-10">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] bg-white/88 shadow-[0_18px_48px_rgba(94,80,52,0.12)] ring-1 ring-[#ead7b8]">
        <div className="bg-[linear-gradient(135deg,#e6f3dc,#fff8ec)] px-5 py-7 text-center sm:px-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-moss shadow-sm ring-1 ring-[#c9dcc0]">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-ink">报名成功</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            请保存这个页面。活动前可以用凭证和发起人确认报名。
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-7">
          <div className="rounded-2xl bg-[#fff8ec] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a7448]">
              报名凭证
            </p>
            <p className="mt-2 text-2xl font-bold tracking-wide text-ink">
              {receiptCode}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-ink">
              {receipt.activity.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              发起人：{receipt.activity.organizer.nickname}
            </p>
          </div>

          <div className="grid gap-3">
            <p className="flex items-start gap-2 text-sm text-zinc-700">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#9a7448]" />
              <span>{dateLabel}</span>
            </p>
            <p className="flex items-start gap-2 text-sm text-zinc-700">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9a7448]" />
              <span>{receipt.activity.address}</span>
            </p>
            <p className="flex items-start gap-2 text-sm text-zinc-700">
              <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-[#9a7448]" />
              <span>
                {receipt.displayName} · {receipt.attendeeCount} 人
              </span>
            </p>
            <p className="flex items-start gap-2 text-sm text-zinc-700">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#9a7448]" />
              <span>{receipt.activity.priceText}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-[#d8ccb4] bg-[#fffaf2] p-4">
            <p className="text-sm font-semibold text-ink">复制到微信群</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-zinc-600 ring-1 ring-[#ead7b8]">
              <span className="min-w-0 flex-1 truncate">{shareText}</span>
              <ActivityCopyButton
                failedLabel="复制失败"
                label="复制报名信息"
                successLabel="已复制"
                value={shareText}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#d88d72] px-4 text-sm font-semibold text-white transition hover:bg-[#c87b61]"
              href={withLocale(locale, `/e/${receipt.activity.id}`)}
            >
              返回活动页
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-[#d8ccb4] transition hover:bg-[#fff8ec]"
              href={withLocale(locale, "/activities")}
            >
              发现更多活动
            </Link>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
