import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { AssetCreateSchema, ApiResponse } from "@/lib/validation/schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const data = dbStore.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      episodeCode: data.episode.codeSerie,
      assets: data.assets,
      thumbnails: data.assets.filter((a) => a.assetType === "THUMBNAIL"),
      audio: data.assets.filter((a) => a.assetType === "AUDIO"),
      others: data.assets.filter((a) => a.assetType !== "THUMBNAIL" && a.assetType !== "AUDIO"),
    },
  } as ApiResponse);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = verifyAuth(req, "WRITE");
  if (!auth.isAuthenticated && req.headers.get("x-internal-request") !== "true") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: auth.error || "Unauthorized" } },
      { status: 401 }
    );
  }

  const { code } = await params;
  const data = dbStore.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const validated = AssetCreateSchema.parse(body);

    const asset = dbStore.addAsset(
      data.episode.id,
      {
        episodeId: data.episode.id,
        assetType: validated.assetType,
        filename: validated.filename,
        blobUrl: validated.blobUrl,
        mimeType: validated.mimeType || null,
        fileSize: validated.fileSize || null,
        variant: validated.variant || null,
        version: validated.version || 1,
        isPrimary: validated.isPrimary || false,
      },
      validated.actor || (auth.role === "GPT_PRODUCTION" ? "GPT" : "USER")
    );

    return NextResponse.json(
      {
        success: true,
        data: asset,
      } as ApiResponse,
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: err.message } },
      { status: 422 }
    );
  }
}
