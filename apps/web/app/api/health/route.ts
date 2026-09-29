import { NextResponse } from "next/server";
import { isDrawGuessChainEnabled } from "@/features/game-tools/drawGuessFlags";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DrawGuessCronJob = {
  active: boolean;
  end_time: Date | null;
  jobname: string;
  status: string | null;
};

const DEFAULT_ARTWORK_WARN_BYTES = 256 * 1024 * 1024;

function artworkWarnBytes() {
  const configured = Number(process.env.DRAW_GUESS_ARTWORK_WARN_BYTES);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_ARTWORK_WARN_BYTES;
}

export async function GET() {
  if (isDrawGuessChainEnabled()) {
    try {
      const [overdueRooms, openReports, jobs, artworkSize] = await Promise.all([
        prisma.gameToolRoom.count({
          where: {
            kind: "DRAW_GUESS",
            status: "IN_PROGRESS",
            drawGuessDeadlineAt: { lt: new Date(Date.now() - 30_000) },
          },
        }),
        prisma.drawGuessReport.count({ where: { status: "OPEN" } }),
        prisma.$queryRaw<DrawGuessCronJob[]>`
          SELECT j.jobname, j.active, d.status, d.end_time
          FROM cron.job j
          LEFT JOIN LATERAL (
            SELECT status, end_time
            FROM cron.job_run_details
            WHERE jobid = j.jobid
            ORDER BY runid DESC
            LIMIT 1
          ) d ON true
          WHERE j.jobname IN ('draw_guess_preview_deadlines', 'draw_guess_preview_maintenance')
        `,
        prisma.$queryRaw<{ bytes: bigint }[]>`
          SELECT pg_total_relation_size('"DrawGuessArtwork"')::bigint AS bytes
        `,
      ]);
      const deadlineJob = jobs.find((job) => job.jobname === "draw_guess_preview_deadlines");
      const maintenanceJob = jobs.find((job) => job.jobname === "draw_guess_preview_maintenance");
      const deadlineHealthy = Boolean(
        deadlineJob?.active && deadlineJob.status === "succeeded" && deadlineJob.end_time &&
        Date.now() - deadlineJob.end_time.getTime() < 30_000,
      );
      const artworkBytes = artworkSize[0]?.bytes ?? 0n;
      const artworkStorageHealthy = artworkBytes < BigInt(artworkWarnBytes());
      const healthy = overdueRooms === 0 && openReports < 10 && deadlineHealthy &&
        Boolean(maintenanceJob?.active) && artworkStorageHealthy;
      if (!healthy) {
        console.warn("[draw-guess] health degraded", {
          artworkBytes: artworkBytes.toString(),
          artworkStorageHealthy,
          deadlineHealthy,
          maintenanceActive: Boolean(maintenanceJob?.active),
          openReports,
          overdueRooms,
        });
      }
      return NextResponse.json({ ok: healthy, service: "next-fun-club", timestamp: new Date().toISOString() }, {
        headers: { "cache-control": "no-store" },
        status: healthy ? 200 : 503,
      });
    } catch (error) {
      console.error("[draw-guess] health check failed", error);
      return NextResponse.json({ ok: false, service: "next-fun-club", timestamp: new Date().toISOString() }, {
        headers: { "cache-control": "no-store" },
        status: 503,
      });
    }
  }
  return NextResponse.json({ ok: true, service: "next-fun-club", timestamp: new Date().toISOString() }, {
    headers: { "cache-control": "no-store" },
  });
}
