import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { exportEpisodesToCsv } from "@/lib/csv/exporter";

export async function GET(req: NextRequest) {
  const allEpisodes = dbStore.getAllEpisodes().map((e) => ({
    globalId: e.episode.globalId,
    codeSerie: e.episode.codeSerie,
    episodeNumber: e.episode.episodeNumber,
    title: e.episode.title,
    conceptPlaylist: e.episode.conceptPlaylist,
    thumbnailText: e.episode.thumbnailText,
    thumbnailVisual: e.episode.thumbnailVisual,
    hook: e.episode.hook,
    keywords: e.episode.keywords,
    description: e.episode.description,
  }));

  const csvString = exportEpisodesToCsv(allEpisodes);
  const nowStr = new Date().toISOString().split("T")[0];

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Speak_English_With_Flow_Planning_${nowStr}.csv"`,
      "Cache-Control": "no-cache",
    },
  });
}
