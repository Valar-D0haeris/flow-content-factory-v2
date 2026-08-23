import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAgentGatewayAuth, withTimeout, createGatewayErrorResponse } from "@/lib/agent-gateway/service";

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
    const all = await withTimeout(
      repository.getAllEpisodes(),
      8000,
      "Fetch All Episode Statuses"
    );

    const episodes = all.map(({ episode, production }) => ({
      code: episode.codeSerie,
      globalId: episode.globalId,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      playlist: episode.conceptPlaylist,
      status: production.publicationStatus || production.planningStatus || "NOT_STARTED",
      stages: {
        planning: production.planningStatus,
        script: production.scriptStatus,
        review: production.reviewStatus,
        audio: production.audioStatus,
        metadata: production.metadataStatus,
        thumbnail: production.thumbnailStatus,
        publication: production.publicationStatus,
      },
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          episodes,
          total: episodes.length,
        },
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
