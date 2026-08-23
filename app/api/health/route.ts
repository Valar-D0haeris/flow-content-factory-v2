import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const version = "2.0.0";
  let databaseStatus: "connected" | "unavailable" | "disabled" = "disabled";

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    try {
      const sql = neon(databaseUrl);
      // Fast probe with 3s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB_PING_TIMEOUT")), 3000)
      );
      const pingPromise = sql`SELECT 1 as ping`;
      
      await Promise.race([pingPromise, timeoutPromise]);
      databaseStatus = "connected";
    } catch {
      databaseStatus = "unavailable";
    }
  }

  const responseBody = {
    status: databaseStatus === "unavailable" ? "degraded" : "ok",
    database: databaseStatus,
    timestamp,
    version,
  };

  const httpStatus = databaseStatus === "unavailable" ? 503 : 200;

  return NextResponse.json(responseBody, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
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
