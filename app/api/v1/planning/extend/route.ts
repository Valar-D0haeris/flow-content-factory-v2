import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { PlanningExtendSchema, ApiResponse } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const auth = verifyAuth(req, "WRITE");
  if (!auth.isAuthenticated && req.headers.get("x-internal-request") !== "true") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: auth.error || "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validated = PlanningExtendSchema.parse(body);

    const created = dbStore.extendPlanning(
      validated.episodes,
      validated.actor || (auth.role === "GPT_PRODUCTION" ? "GPT" : "USER")
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          createdEpisodes: created,
          count: created.length,
          newTotal: dbStore.getAllEpisodes().length,
        },
        meta: {
          message: `Planning successfully extended with ${created.length} new episodes.`,
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
