import { NextResponse } from "next/server";
import { getGuestRegistrationsForOrganizer } from "@/features/wechat-bridge/queries/getPublicRegistrationActivity";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

type GuestRegistrationsCsvRouteProps = {
  params: Promise<{
    activityId: string;
  }>;
};

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = value === null || value === undefined ? "" : String(value);

  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: GuestRegistrationsCsvRouteProps,
) {
  const { activityId } = await params;
  const viewerProfile = await getOptionalCurrentUserProfileSnapshot();

  if (!viewerProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activity = await getGuestRegistrationsForOrganizer({
    activityId,
    organizerId: viewerProfile.id,
  });

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = [
    ["昵称", "联系方式", "人数", "状态", "备注", "报名时间"],
    ...activity.guestRegistrations.map((registration) => [
      registration.displayName,
      registration.contactEncrypted ?? "",
      registration.attendeeCount,
      registration.status === "ACTIVE" ? "有效" : "已取消",
      registration.note ?? "",
      registration.joinedAt,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Disposition": `attachment; filename="guest-registrations-${activity.id}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
