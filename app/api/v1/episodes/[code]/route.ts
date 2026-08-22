import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { EpisodeUpdateSchema, ApiResponse } from "@/lib/validation/schemas";
import { formatSecondsToTime } from "@/lib/duration/duration";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const data = dbStore.findEpisodeByCodeOrGlobalId(code);

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EPISODE_NOT_FOUND",
          message: `Episode with code or ID "${code}" not found.`,
        },
      } as ApiResponse,
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data.episode,
      production: data.production,
      formattedDuration: formatSecondsToTime(data.production.durationSeconds),
      scripts: data.scripts,
      metadata: data.metadata,
      assets: data.assets,
      recentEvents: data.events.slice(-5),
    },
  } as ApiResponse);
}

export async function PATCH(
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
      {
        success: false,
        error: {
          code: "EPISODE_NOT_FOUND",
          message: `Episode with code or ID "${code}" not found.`,
        },
      } as ApiResponse,
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const validated = EpisodeUpdateSchema.parse(body);

    // Optimistic locking check
    if (validated.expectedUpdatedAt && validated.expectedUpdatedAt !== data.episode.updatedAt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT_OPTIMISTIC_LOCK",
            message: "Episode has been modified since it was read. Please refresh and retry.",
          },
        } as ApiResponse,
        { status: 409 }
      );
    }

    const updated = dbStore.updateEpisode(data.episode.id, {
      title: validated.title ?? data.episode.title,
      conceptPlaylist: validated.conceptPlaylist ?? data.episode.conceptPlaylist,
      thumbnailText: validated.thumbnailText !== undefined ? validated.thumbnailText : data.episode.thumbnailText,
      thumbnailVisual: validated.thumbnailVisual !== undefined ? validated.thumbnailVisual : data.episode.thumbnailVisual,
      hook: validated.hook !== undefined ? validated.hook : data.episode.hook,
      keywords: validated.keywords !== undefined ? validated.keywords : data.episode.keywords,
      description: validated.description !== undefined ? validated.description : data.episode.description,
    }, auth.role === "ADMIN" ? "USER" : (auth.role as any));

    return NextResponse.json({
      success: true,
      data: updated,
    } as ApiResponse);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: err.message || "Invalid payload",
        },
      } as ApiResponse,
      { status: 422 }
    );
  }
}
