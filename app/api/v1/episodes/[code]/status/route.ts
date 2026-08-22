import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { isValidStatusTransition } from "@/lib/production/status";
import { PRODUCTION_STATUSES, ProductionStatus } from "@/db/schema";
import { ApiResponse } from "@/lib/validation/schemas";
import { z } from "zod";

const StatusUpdateSchema = z.object({
  status: z.enum(PRODUCTION_STATUSES),
  step: z
    .enum([
      "planningStatus",
      "scriptStatus",
      "reviewStatus",
      "audioStatus",
      "metadataStatus",
      "thumbnailStatus",
      "publicationStatus",
      "overall",
    ])
    .optional()
    .default("overall"),
  actor: z.enum(["USER", "GPT", "SYSTEM", "DASHBOARD"]).optional().default("USER"),
  reason: z.string().optional(),
});

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
    const validated = StatusUpdateSchema.parse(body);

    const currentProd = data.production;
    const targetStatus = validated.status as ProductionStatus;

    if (validated.step === "overall" || validated.step === "publicationStatus") {
      // Validate transition from current publication/planning status
      const currentOverall = (currentProd.publicationStatus || currentProd.planningStatus) as ProductionStatus;
      const check = isValidStatusTransition(currentOverall, targetStatus);
      if (!check.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: check.error,
            },
          } as ApiResponse,
          { status: 422 }
        );
      }

      const updated = dbStore.updateProduction(
        data.episode.id,
        {
          planningStatus: targetStatus,
          publicationStatus: targetStatus,
        },
        validated.actor
      );

      return NextResponse.json({
        success: true,
        data: updated,
      } as ApiResponse);
    } else {
      const stepKey = validated.step as keyof typeof currentProd;
      const currentStepVal = (currentProd[stepKey] || "NOT_STARTED") as ProductionStatus;
      const check = isValidStatusTransition(currentStepVal, targetStatus);
      if (!check.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: check.error,
            },
          } as ApiResponse,
          { status: 422 }
        );
      }

      const updated = dbStore.updateProduction(
        data.episode.id,
        {
          [validated.step]: targetStatus,
        },
        validated.actor
      );

      return NextResponse.json({
        success: true,
        data: updated,
      } as ApiResponse);
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: err.message } },
      { status: 422 }
    );
  }
}
