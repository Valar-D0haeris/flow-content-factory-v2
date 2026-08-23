import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";
import { ApiResponse } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const events = await repository.getEvents(code, 50);

  return NextResponse.json(
    {
      success: true,
      data: {
        episodeCode: code,
        events,
        totalEvents: events.length,
      },
    } as ApiResponse,
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
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
