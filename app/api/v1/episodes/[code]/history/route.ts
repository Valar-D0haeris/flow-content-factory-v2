import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { ApiResponse } from "@/lib/validation/schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const data = dbStore.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404 }
    );
  }

  const events = dbStore.getEvents(data.episode.id, 50);

  return NextResponse.json({
    success: true,
    data: {
      episodeCode: data.episode.codeSerie,
      events,
      totalEvents: events.length,
    },
  } as ApiResponse);
}
