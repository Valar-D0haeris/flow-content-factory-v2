import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAuth(req, "READ");
  const { searchParams } = new URL(req.url);

  const playlist = searchParams.get("playlist");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const list = await repository.getAllEpisodes({ playlist, status, search });

  const response: ApiResponse = {
    success: true,
    data: {
      episodes: list.map((item) => ({
        id: item.episode.id,
        globalId: item.episode.globalId,
        codeSerie: item.episode.codeSerie,
        episodeNumber: item.episode.episodeNumber,
        title: item.episode.title,
        conceptPlaylist: item.episode.conceptPlaylist,
        thumbnailText: item.episode.thumbnailText,
        thumbnailVisual: item.episode.thumbnailVisual,
        hook: item.episode.hook,
        keywords: item.episode.keywords,
        description: item.episode.description,
        production: item.production,
        formattedDuration: formatSecondsToTime(item.production.durationSeconds || 0),
        scriptsCount: item.scriptsCount,
        assetsCount: item.assetsCount,
        updatedAt: item.episode.updatedAt ? new Date(item.episode.updatedAt).toISOString() : new Date().toISOString(),
      })),
      total: list.length,
    },
    meta: {
      filters: { playlist, status, search },
      role: auth.role,
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
