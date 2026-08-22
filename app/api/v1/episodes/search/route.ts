import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || searchParams.get("query") || "").trim().toLowerCase();
  const code = searchParams.get("code")?.toLowerCase();
  const playlist = searchParams.get("playlist")?.toLowerCase();
  const status = searchParams.get("status");

  let list = dbStore.getAllEpisodes();

  if (code) {
    list = list.filter((item) => item.episode.codeSerie.toLowerCase().includes(code));
  }

  if (playlist) {
    list = list.filter((item) => item.episode.conceptPlaylist.toLowerCase().includes(playlist));
  }

  if (status) {
    list = list.filter(
      (item) =>
        item.production.planningStatus === status ||
        item.production.scriptStatus === status ||
        item.production.publicationStatus === status
    );
  }

  if (q) {
    list = list.filter((item) => {
      const ep = item.episode;
      return (
        ep.title.toLowerCase().includes(q) ||
        ep.codeSerie.toLowerCase().includes(q) ||
        ep.globalId.toLowerCase().includes(q) ||
        ep.conceptPlaylist.toLowerCase().includes(q) ||
        (ep.hook && ep.hook.toLowerCase().includes(q)) ||
        (ep.keywords && ep.keywords.toLowerCase().includes(q)) ||
        (ep.description && ep.description.toLowerCase().includes(q)) ||
        (ep.thumbnailText && ep.thumbnailText.toLowerCase().includes(q))
      );
    });
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
        formattedDuration: formatSecondsToTime(item.production.durationSeconds),
      })),
      totalMatches: list.length,
    },
    meta: {
      query: q,
      code,
      playlist,
    },
  };

  return NextResponse.json(response);
}
