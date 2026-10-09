import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import {
  AdminBookingActivityLockedError,
  deleteAdminActivity,
  updateAdminActivity,
} from "@/lib/admin-scraper";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const { activityId } = await params;
  const body = await request.json();
  try {
    const updated = await updateAdminActivity(activityId, body);
    return NextResponse.json({ activity: updated });
  } catch (error) {
    if (error instanceof AdminBookingActivityLockedError) {
      return NextResponse.json(
        {
          code: "BOOKING_ACTIVITY_LOCKED",
          error:
            "预约生成的聚吧不能在通用活动管理中修改，请到店铺预约详情管理。",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const { activityId } = await params;
  try {
    await deleteAdminActivity(activityId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminBookingActivityLockedError) {
      return NextResponse.json(
        {
          code: "BOOKING_ACTIVITY_LOCKED",
          error: "预约生成的聚吧不能直接删除；可在聚吧详情取消并保留预约记录。",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
