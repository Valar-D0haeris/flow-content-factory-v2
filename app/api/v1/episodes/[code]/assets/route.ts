import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";
import { AssetCreateSchema, ApiResponse } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const data = await repository.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        episodeCode: data.episode.codeSerie,
        assets: data.assets,
        totalAssets: data.assets.length,
      },
    } as ApiResponse,
    { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export async function POST(
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
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const body = await req.json();
    const validated = AssetCreateSchema.parse(body);

    const asset = await repository.addAsset(data.episode.id, {
      ...validated,
      actor: validated.actor || (auth.role === "GPT_PRODUCTION" ? "GPT" : "USER"),
    });

    return NextResponse.json(
      {
        success: true,
        data: asset,
      } as ApiResponse,
      { status: 201, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: err.message } },
      { status: 422, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
