import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { verifyAgentGatewayAuth, withTimeout, createGatewayErrorResponse } from "@/lib/agent-gateway/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = verifyAgentGatewayAuth(req);
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      {
        status: "unauthorized",
        gateway: "ok",
        error: {
          code: "UNAUTHORIZED",
          message: auth.error,
        },
      },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    const dbCheck = await withTimeout(
      repository.getProductionStats(),
      5000,
      "Neon PostgreSQL Health Check"
    );

    return NextResponse.json(
      {
        status: "ok",
        gateway: "ok",
        flowApi: "ok",
        database: "connected",
        stats: {
          totalEpisodes: dbCheck.totalEpisodes,
          completed: dbCheck.completed,
          inProgress: dbCheck.inProgress,
        },
        timestamp: new Date().toISOString(),
        version: "2.0.0",
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    return createGatewayErrorResponse(err);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-agent-gateway-key",
    },
  });
}
