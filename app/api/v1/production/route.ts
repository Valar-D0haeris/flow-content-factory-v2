import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { ApiResponse } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  // Public or token-authenticated
  const auth = verifyAuth(req, "READ");
  // Allow internal reads even if unauthenticated for dashboard
  const episodesData = dbStore.getAllEpisodes();

  let total = episodesData.length;
  let notStarted = 0;
  let inProgress = 0;
  let waitingUser = 0;
  let ready = 0;
  let approved = 0;
  let completed = 0;
  let blocked = 0;
  let totalDurationSeconds = 0;

  episodesData.forEach(({ production }) => {
    const s = production.publicationStatus || production.planningStatus;
    if (s === "COMPLETED") completed++;
    else if (s === "IN_PROGRESS") inProgress++;
    else if (s === "WAITING_USER") waitingUser++;
    else if (s === "READY") ready++;
    else if (s === "APPROVED") approved++;
    else if (s === "BLOCKED") blocked++;
    else notStarted++;

    totalDurationSeconds += production.durationSeconds || 0;
  });

  const response: ApiResponse = {
    success: true,
    data: {
      stats: {
        totalEpisodes: total,
        notStarted,
        inProgress,
        waitingUser,
        ready,
        approved,
        completed,
        blocked,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalDurationSeconds,
      },
      recentEvents: dbStore.getEvents(null, 10),
    },
    meta: {
      timestamp: new Date().toISOString(),
      role: auth.role,
    },
  };

  return NextResponse.json(response);
}
