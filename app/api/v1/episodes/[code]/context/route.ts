import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const data = dbStore.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EPISODE_NOT_FOUND",
          message: `Episode with code or ID "${code}" not found in Flow Content Factory memory.`,
        },
      } as ApiResponse,
      { status: 404 }
    );
  }

  const ep = data.episode;
  const prod = data.production;
  const latestScript = data.scripts[data.scripts.length - 1] || null;
  const primaryThumb = data.assets.find((a) => a.assetType === "THUMBNAIL" && a.isPrimary);
  const audioAsset = data.assets.find((a) => a.assetType === "AUDIO");

  const contextPackage = {
    identity: {
      id: ep.id,
      globalId: ep.globalId,
      codeSerie: ep.codeSerie,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      conceptPlaylist: ep.conceptPlaylist,
    },
    editorial: {
      hook: ep.hook,
      thumbnailBrief: {
        text: ep.thumbnailText,
        visual: ep.thumbnailVisual,
      },
      keywordsList: ep.keywords ? ep.keywords.split(",").map((k) => k.trim()) : [],
      description: ep.description,
    },
    productionState: {
      planningStatus: prod.planningStatus,
      scriptStatus: prod.scriptStatus,
      reviewStatus: prod.reviewStatus,
      audioStatus: prod.audioStatus,
      metadataStatus: prod.metadataStatus,
      thumbnailStatus: prod.thumbnailStatus,
      publicationStatus: prod.publicationStatus,
      durationSeconds: prod.durationSeconds,
      formattedDuration: formatSecondsToTime(prod.durationSeconds),
      humanDuration: formatSecondsToHuman(prod.durationSeconds),
    },
    script: latestScript
      ? {
          versionNumber: latestScript.versionNumber,
          status: latestScript.status,
          wordCount: latestScript.wordCount,
          characterCount: latestScript.characterCount,
          estimatedDurationSeconds: latestScript.estimatedDurationSeconds,
          content: latestScript.content,
          createdBy: latestScript.createdBy,
          createdAt: latestScript.createdAt,
        }
      : null,
    metadata: data.metadata
      ? {
          titleOptions: [
            data.metadata.titleOption1,
            data.metadata.titleOption2,
            data.metadata.titleOption3,
          ].filter(Boolean),
          selectedTitle: data.metadata.selectedTitle,
          description: data.metadata.description,
          chapters: data.metadata.chapters,
          tags: data.metadata.tags,
          playlist: data.metadata.playlist,
        }
      : null,
    assetsSummary: {
      totalAssets: data.assets.length,
      primaryThumbnailUrl: primaryThumb?.blobUrl || null,
      audioUrl: audioAsset?.blobUrl || null,
      thumbnails: data.assets
        .filter((a) => a.assetType === "THUMBNAIL")
        .map((t) => ({
          variant: t.variant,
          filename: t.filename,
          url: t.blobUrl,
          isPrimary: t.isPrimary,
        })),
    },
    recentAuditHistory: data.events.slice(-5).map((e) => ({
      eventType: e.eventType,
      actor: e.actorType,
      description: e.description,
      timestamp: e.createdAt,
    })),
  };

  return NextResponse.json({
    success: true,
    data: contextPackage,
    meta: {
      purpose: "EDITORIAL_MEMORY_FOR_GPT_AND_PRODUCTION",
      timestamp: new Date().toISOString(),
    },
  } as ApiResponse);
}
