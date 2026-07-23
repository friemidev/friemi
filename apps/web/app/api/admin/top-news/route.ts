import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import {
  getAdminTopNewsItems,
  replaceAdminTopNewsItems,
} from "@/features/home/adminTopNews";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const items = await getAdminTopNewsItems();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;

  const body = await request.json();
  const result = await replaceAdminTopNewsItems(body);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ items: result.items });
}
