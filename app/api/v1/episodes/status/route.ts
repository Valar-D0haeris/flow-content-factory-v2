import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAuth(req, "READ");
  if (!auth.isAuthenticated && req.headers.get("x-internal-request") !== "true") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: auth.error || "Missing or invalid API Key in Authorization: Bearer <key> or x-api-key header",
        },
      },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    const all = await repository.getAllEpisodes();
    
    const episodes = all.map(({ episode, production }) => ({
      code: episode.codeSerie,
      globalId: episode.globalId,
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
        episodes,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve episode statuses",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
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
