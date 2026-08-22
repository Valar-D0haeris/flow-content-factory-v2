import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { findNextEpisodeToProduce } from "@/lib/production/status";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export async function GET(req: NextRequest) {
  const allEpisodes = dbStore.getAllEpisodes();

  // Format list for next resolution
  const mapped = allEpisodes.map(({ episode, production }) => ({
    id: episode.id,
    globalId: episode.globalId,
    codeSerie: episode.codeSerie,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    conceptPlaylist: episode.conceptPlaylist,
    production: {
      planningStatus: production.planningStatus,
      scriptStatus: production.scriptStatus,
      audioStatus: production.audioStatus,
      publicationStatus: production.publicationStatus,
    },
  }));

  const resolution = findNextEpisodeToProduce(mapped);

  if (!resolution.nextEpisode) {
    const res: ApiResponse = {
      success: true,
      data: {
        nextEpisode: null,
        message: resolution.reason,
        allCompleted: true,
      },
    };
    return NextResponse.json(res);
  }

  // Fetch complete context for the next episode
  const fullContext = dbStore.findEpisodeByCodeOrGlobalId(resolution.nextEpisode.codeSerie);

  const res: ApiResponse = {
    success: true,
    data: {
      nextEpisode: {
        id: fullContext?.episode.id,
        globalId: fullContext?.episode.globalId,
        codeSerie: fullContext?.episode.codeSerie,
        episodeNumber: fullContext?.episode.episodeNumber,
        title: fullContext?.episode.title,
        conceptPlaylist: fullContext?.episode.conceptPlaylist,
        thumbnailText: fullContext?.episode.thumbnailText,
        thumbnailVisual: fullContext?.episode.thumbnailVisual,
        hook: fullContext?.episode.hook,
        keywords: fullContext?.episode.keywords,
        description: fullContext?.episode.description,
        production: fullContext?.production,
        formattedDuration: formatSecondsToTime(fullContext?.production.durationSeconds),
        latestScript: fullContext?.scripts[fullContext.scripts.length - 1] || null,
        metadata: fullContext?.metadata || null,
        assets: fullContext?.assets || [],
      },
      reason: resolution.reason,
      ambiguityDetected: resolution.ambiguityDetected,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(res);
}
