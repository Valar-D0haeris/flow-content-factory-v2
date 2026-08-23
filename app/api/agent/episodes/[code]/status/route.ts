import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAgentGatewayAuth, withTimeout, createGatewayErrorResponse } from "@/lib/agent-gateway/service";

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
      `Fetch Episode Status for ${code}`
    );

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EPISODE_NOT_FOUND",
            message: `Episode "${code}" was not found in Flow Content Factory repository.`,
          },
        },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const ep = data.episode;
    const prod = data.production;

    return NextResponse.json(
      {
        success: true,
        data: {
          code: ep.codeSerie,
          globalId: ep.globalId,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          status: prod.publicationStatus || prod.planningStatus || "NOT_STARTED",
          stages: {
            planning: prod.planningStatus,
            script: prod.scriptStatus,
            review: prod.reviewStatus,
            audio: prod.audioStatus,
            metadata: prod.metadataStatus,
            thumbnail: prod.thumbnailStatus,
            publication: prod.publicationStatus,
          },
          durationSeconds: prod.durationSeconds || 0,
          scriptsCount: data.scriptsCount,
          assetsCount: data.assetsCount,
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
