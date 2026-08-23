import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAuth } from "@/lib/auth/service";
import { ApiResponse } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAuth(req, "READ");
  const stats = await repository.getProductionStats();
  const all = await repository.getAllEpisodes();
  const recentEvents = all.flatMap((a) => a.events).slice(0, 10);

  const response: ApiResponse = {
    success: true,
    data: {
      stats,
      recentEvents,
    },
    meta: {
      timestamp: new Date().toISOString(),
      role: auth.role,
      source: "neon_postgresql",
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
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
