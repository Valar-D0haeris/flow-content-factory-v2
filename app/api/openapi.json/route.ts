import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const yamlPath = path.resolve(process.cwd(), "openapi/openapi.yaml");
    const yamlContent = fs.readFileSync(yamlPath, "utf-8");

    // Return the YAML spec with proper MIME type or JSON
    return new NextResponse(yamlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load openapi.yaml", details: err.message }, { status: 500 });
  }
}
