import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";
import { isValidStatusTransition } from "@/lib/production/status";
import { PRODUCTION_STATUSES, ProductionStatus } from "@/db/schema";
import { ApiResponse } from "@/lib/validation/schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const auth = verifyAuth(req, "READ");
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

  const prod = data.production;

  return NextResponse.json(
    {
      code: data.episode.codeSerie,
      globalId: data.episode.globalId,
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
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
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
      { success: false, error: { code: "EPISODE_NOT_FOUND", message: `Episode ${code} not found` } },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const body = await req.json();
    const validated = StatusUpdateSchema.parse(body);

    const currentProd = data.production;
    const targetStatus = validated.status as ProductionStatus;

    if (validated.step === "overall" || validated.step === "publicationStatus") {
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
          { status: 422, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      const updated = await repository.updateProduction(
        data.episode.id,
        {
          planningStatus: targetStatus,
          publicationStatus: targetStatus,
        },
        validated.actor
      );

      return NextResponse.json(
        {
          success: true,
          data: updated,
        } as ApiResponse,
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
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
          { status: 422, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      const updated = await repository.updateProduction(
        data.episode.id,
        {
          [validated.step]: targetStatus,
        },
        validated.actor
      );

      return NextResponse.json(
        {
          success: true,
          data: updated,
        } as ApiResponse,
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
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
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
