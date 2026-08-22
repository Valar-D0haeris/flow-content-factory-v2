import { NextRequest, NextResponse } from "next/server";
import { dbStore } from "@/db/store";
import { verifyAuth } from "@/lib/auth/service";
import { parsePlanningCsv } from "@/lib/csv/parser";
import { generateCsvDiff } from "@/lib/csv/diff";
import { ApiResponse } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  const auth = verifyAuth(req, "WRITE");
  if (!auth.isAuthenticated && req.headers.get("x-internal-request") !== "true") {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: auth.error || "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let csvText = "";
    let action = "preview"; // "preview" | "confirm"

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      action = (formData.get("action") as string) || "preview";
      if (!file) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_REQUIRED", message: "CSV file is required" } },
          { status: 400 }
        );
      }
      csvText = await file.text();
    } else {
      const body = await req.json();
      csvText = body.csvContent || "";
      action = body.action || "preview";
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY_CONTENT", message: "CSV content cannot be empty" } },
        { status: 400 }
      );
    }

    // 1. Parse & Validate Structure
    const parseResult = parsePlanningCsv(csvText);

    if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CSV_PARSING_FAILED",
            message: "Failed to parse CSV file. Header or format invalid.",
            details: parseResult.errors,
          },
        } as ApiResponse,
        { status: 422 }
      );
    }

    // 2. Fetch existing episodes
    const existing = dbStore.getAllEpisodes().map((e) => e.episode);

    // 3. Compute Diff
    const diffReport = generateCsvDiff(parseResult.rows, existing);

    if (!diffReport.canProceed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CSV_VALIDATION_ERROR",
            message: "Duplicate keys or validation errors found in CSV",
            details: diffReport.summary.duplicateErrors,
          },
          data: diffReport,
        } as ApiResponse,
        { status: 422 }
      );
    }

    // 4. If Preview mode requested, return diff
    if (action === "preview") {
      return NextResponse.json({
        success: true,
        data: {
          action: "preview",
          diff: diffReport,
          parsingWarnings: parseResult.errors,
        },
      } as ApiResponse);
    }

    // 5. If Confirm mode, execute transaction
    const toCreate = diffReport.items
      .filter((i) => i.type === "CREATE")
      .map((i) => ({
        globalId: i.globalId,
        codeSerie: i.codeSerie,
        title: i.data["Titre de la Vidéo"],
        conceptPlaylist: i.data["Concept / Playlist"],
        thumbnailText: i.data["Texte Miniature"],
        thumbnailVisual: i.data["Visuel Miniature"],
        hook: i.data["Hook (0-15s)"],
        keywords: i.data["Mots-Clés (15 tags)"],
        description: i.data["Description Complète"],
      }));

    const toUpdate: Array<{ id: string; updates: any }> = [];
    diffReport.items
      .filter((i) => i.type === "UPDATE")
      .forEach((i) => {
        const existingEp = existing.find(
          (e) => e.globalId === i.globalId || e.codeSerie === i.codeSerie
        );
        if (existingEp) {
          toUpdate.push({
            id: existingEp.id,
            updates: {
              codeSerie: i.data["Code Série"],
              title: i.data["Titre de la Vidéo"],
              conceptPlaylist: i.data["Concept / Playlist"],
              thumbnailText: i.data["Texte Miniature"],
              thumbnailVisual: i.data["Visuel Miniature"],
              hook: i.data["Hook (0-15s)"],
              keywords: i.data["Mots-Clés (15 tags)"],
              description: i.data["Description Complète"],
            },
          });
        }
      });

    const result = dbStore.importCsvConfirmed(
      toCreate,
      toUpdate,
      auth.role === "GPT_PRODUCTION" ? "GPT" : "USER"
    );

    return NextResponse.json({
      success: true,
      data: {
        action: "confirmed",
        result,
        message: `Import applied successfully: ${result.created} created, ${result.updated} updated.`,
      },
    } as ApiResponse);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "IMPORT_ERROR", message: err.message } },
      { status: 500 }
    );
  }
}
