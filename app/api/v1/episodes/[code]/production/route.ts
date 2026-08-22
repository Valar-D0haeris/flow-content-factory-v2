import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { ProductionUpdateSchema, ApiResponse } from "@/lib/validation/schemas";
import { parseDurationToSeconds, formatSecondsToTime } from "@/lib/duration/duration";

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
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const validated = ProductionUpdateSchema.parse(body);

    let duration = validated.durationSeconds;
    if (validated.durationInput) {
      duration = parseDurationToSeconds(validated.durationInput);
    }

    const updates: any = {};
    if (validated.planningStatus) updates.planningStatus = validated.planningStatus;
    if (validated.scriptStatus) updates.scriptStatus = validated.scriptStatus;
    if (validated.reviewStatus) updates.reviewStatus = validated.reviewStatus;
    if (validated.audioStatus) updates.audioStatus = validated.audioStatus;
    if (validated.metadataStatus) updates.metadataStatus = validated.metadataStatus;
    if (validated.thumbnailStatus) updates.thumbnailStatus = validated.thumbnailStatus;
    if (validated.publicationStatus) updates.publicationStatus = validated.publicationStatus;
    if (duration !== undefined) updates.durationSeconds = duration;

    const updated = dbStore.updateProduction(
      data.episode.id,
      updates,
      validated.actor || (auth.role === "GPT_PRODUCTION" ? "GPT" : "USER")
    );

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        formattedDuration: formatSecondsToTime(updated.durationSeconds),
      },
    } as ApiResponse);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: err.message } },
      { status: 422 }
    );
  }
}
