import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAgentGatewayAuth, withTimeout, createGatewayErrorResponse } from "@/lib/agent-gateway/service";
import { formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  try {
    const nextItem = await withTimeout(
      repository.getNextEpisodeToProduce(),
      8000,
      "Determine Next Episode To Produce"
    );

    if (!nextItem) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          meta: {
            gateway: "Flow Content Factory Agent Gateway v1",
            message: "All planned episodes are currently completed.",
            source: "neon_postgresql",
            timestamp: new Date().toISOString(),
          },
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const ep = nextItem.episode;
    const prod = nextItem.production;
    const scriptsList = nextItem.scripts || [];
    const latestScript = scriptsList.length > 0 ? scriptsList[scriptsList.length - 1] : null;

    const packageData = {
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
          }
        : null,
      recommendation: {
        nextStep:
          prod.planningStatus === "NOT_STARTED"
            ? "START_PLANNING_AND_SCRIPT"
            : prod.scriptStatus === "NOT_STARTED" || prod.scriptStatus === "DRAFT"
            ? "GENERATE_OR_REFINE_SCRIPT"
            : prod.audioStatus === "NOT_STARTED"
            ? "RECORD_OR_GENERATE_AUDIO"
            : prod.metadataStatus === "NOT_STARTED"
            ? "PROPOSE_TITLES_AND_METADATA"
            : prod.thumbnailStatus === "NOT_STARTED"
            ? "GENERATE_THUMBNAIL_VARIANTS"
            : "READY_FOR_FINAL_PUBLICATION",
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: packageData,
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
