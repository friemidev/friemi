import { NextResponse } from "next/server";
import {
  checkDistributedRateLimit,
  getRateLimitResponseHeaders,
} from "./distributedRateLimit";

const UPLOAD_REQUESTS_PER_MINUTE = 40;

export async function getUploadRateLimitRejection(userId: string) {
  const result = await checkDistributedRateLimit({
    identifier: userId,
    limit: UPLOAD_REQUESTS_PER_MINUTE,
    scope: "uploads",
    window: "1 m",
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "UPLOAD_RATE_LIMITED" },
    {
      headers: getRateLimitResponseHeaders(result),
      status: 429,
    },
  );
}
