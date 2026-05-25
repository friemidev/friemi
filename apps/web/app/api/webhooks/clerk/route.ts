import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import {
  markUserProfileDeletedFromClerk,
  touchUserProfileLastSignIn,
  upsertUserProfileFromClerk
} from "@/lib/user-profile";

export async function POST(request: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return new Response("Webhook verification failed", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated":
      await upsertUserProfileFromClerk(event.data);
      break;
    case "user.deleted":
      await markUserProfileDeletedFromClerk(event.data);
      break;
    case "session.created":
      if (event.data.user_id) {
        await touchUserProfileLastSignIn(event.data.user_id);
      }
      break;
    default:
      break;
  }

  return NextResponse.json({
    received: true
  });
}
