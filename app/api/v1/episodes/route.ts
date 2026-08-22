import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export async function GET(req: NextRequest) {
  const auth = verifyAuth(req, "READ");
  const { searchParams } = new URL(req.url);

  const playlist = searchParams.get("playlist");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let list = dbStore.getAllEpisodes();

  // Filters
  if (playlist) {
    list = list.filter((item) =>
      item.episode.conceptPlaylist.toLowerCase().includes(playlist.toLowerCase())
    );
  }

  if (status) {
    list = list.filter(
      (item) =>
        item.production.planningStatus === status ||
        item.production.scriptStatus === status ||
        item.production.publicationStatus === status
    );
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (item) =>
        item.episode.title.toLowerCase().includes(q) ||
        item.episode.codeSerie.toLowerCase().includes(q) ||
        item.episode.globalId.toLowerCase().includes(q) ||
        (item.episode.keywords && item.episode.keywords.toLowerCase().includes(q))
    );
  }

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
        formattedDuration: formatSecondsToTime(item.production.durationSeconds),
        scriptsCount: item.scriptsCount,
        assetsCount: item.assetsCount,
        updatedAt: item.episode.updatedAt,
      })),
      total: list.length,
    },
    meta: {
      filters: { playlist, status, search },
      role: auth.role,
    },
  };

  return NextResponse.json(response);
}
