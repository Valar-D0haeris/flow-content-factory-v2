import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";
import { EpisodeUpdateSchema, ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const data = await repository.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EPISODE_NOT_FOUND",
          message: `Episode with code or ID "${code}" not found.`,
        },
      } as ApiResponse,
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        ...data.episode,
        production: data.production,
        formattedDuration: formatSecondsToTime(data.production.durationSeconds || 0),
        scripts: data.scripts,
        metadata: data.metadata,
        assets: data.assets,
        recentEvents: data.events.slice(-5),
      },
    } as ApiResponse,
    { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = verifyAuth(req, "WRITE");
  if (!auth.isAuthenticated && req.headers.get("x-internal-request") !== "true") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: auth.error || "Unauthorized" } },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const { code } = await params;
  const data = await repository.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EPISODE_NOT_FOUND",
          message: `Episode with code or ID "${code}" not found.`,
        },
      } as ApiResponse,
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const body = await req.json();
    const validated = EpisodeUpdateSchema.parse(body);

    const updated = await repository.updateProduction(
      data.episode.id,
      validated as any,
      auth.role === "ADMIN" ? "USER" : (auth.role as any)
    );

    return NextResponse.json(
      {
        success: true,
        data: updated,
      } as ApiResponse,
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: err.message || "Invalid payload",
        },
      } as ApiResponse,
      { status: 422, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
