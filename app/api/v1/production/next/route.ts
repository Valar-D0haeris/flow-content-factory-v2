import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";
import { ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAuth(req, "READ");
  if (!auth.isAuthenticated && req.headers.get("x-internal-request") !== "true") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: auth.error || "Unauthorized" } },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const nextItem = await repository.getNextEpisodeToProduce();

  if (!nextItem) {
    return NextResponse.json({
      success: true,
      data: null,
      meta: {
        message: "All planned episodes are currently completed! Extend planning to continue.",
        source: "neon_postgresql",
      },
    } as ApiResponse, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const ep = nextItem.episode;
  const prod = nextItem.production;
  const scriptsList = nextItem.scripts || [];
  const latestScript = scriptsList.length > 0 ? scriptsList[scriptsList.length - 1] : null;

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

  return NextResponse.json({
    success: true,
    data: contextPackage,
    meta: {
      timestamp: new Date().toISOString(),
      role: auth.role,
      source: "neon_postgresql",
    },
  } as ApiResponse, { headers: { "Access-Control-Allow-Origin": "*" } });
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
