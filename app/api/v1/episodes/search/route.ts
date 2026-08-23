import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || searchParams.get("query") || "").trim().toLowerCase();
  const code = searchParams.get("code")?.toLowerCase();
  const playlist = searchParams.get("playlist")?.toLowerCase();
  const status = searchParams.get("status");

  let list = await repository.getAllEpisodes({ playlist, status, search: q });

  if (code) {
    list = list.filter((item) => item.episode.codeSerie.toLowerCase().includes(code));
  }

  const response: ApiResponse = {
    success: true,
    data: {
      results: list.map((item) => ({
        id: item.episode.id,
        globalId: item.episode.globalId,
        codeSerie: item.episode.codeSerie,
        episodeNumber: item.episode.episodeNumber,
        title: item.episode.title,
        conceptPlaylist: item.episode.conceptPlaylist,
        hook: item.episode.hook,
        keywords: item.episode.keywords,
        production: item.production,
        formattedDuration: formatSecondsToTime(item.production.durationSeconds || 0),
      })),
      totalMatches: list.length,
    },
    meta: {
      query: q,
      code,
      playlist,
      source: "neon_postgresql",
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
