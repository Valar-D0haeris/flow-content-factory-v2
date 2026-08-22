import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { ScriptCreateSchema, ApiResponse } from "@/lib/validation/schemas";

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
      versions: data.scripts,
      totalVersions: data.scripts.length,
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
    const validated = ScriptCreateSchema.parse(body);

    const created = dbStore.addScriptVersion(
      data.episode.id,
      validated.content,
      validated.status,
      validated.createdBy || (auth.role === "GPT_PRODUCTION" ? "GPT" : "USER"),
      validated.notes
    );

    return NextResponse.json(
      {
        success: true,
        data: created,
        meta: {
          message: `Script version v${created.versionNumber} successfully created without overwriting previous versions.`,
        },
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
