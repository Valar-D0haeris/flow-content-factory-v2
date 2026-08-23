import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAgentGatewayAuth, withTimeout, createGatewayErrorResponse } from "@/lib/agent-gateway/service";
import { formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = verifyAgentGatewayAuth(req);
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: auth.error,
        },
      },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const { code } = await params;

  try {
    const data = await withTimeout(
      repository.findEpisodeByCodeOrGlobalId(code),
      8000,
      `Fetch Episode Context for ${code}`
    );

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EPISODE_NOT_FOUND",
            message: `Episode "${code}" was not found in Flow Content Factory memory.`,
          },
        },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
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
        durationSeconds: prod.durationSeconds || 0,
        formattedDuration: formatSecondsToTime(prod.durationSeconds || 0),
        humanDuration: formatSecondsToHuman(prod.durationSeconds || 0),
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
      recentEvents: data.events.slice(-5).map((e) => ({
        eventType: e.eventType,
        actor: e.actorType,
        description: e.description,
        timestamp: e.createdAt,
      })),
    };

    return NextResponse.json(
      {
        success: true,
        data: contextPackage,
        meta: {
          gateway: "Flow Content Factory Agent Gateway v1",
          source: "neon_postgresql",
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return createGatewayErrorResponse(err);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-agent-gateway-key",
    },
  });
}
