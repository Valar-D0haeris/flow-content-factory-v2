import { CsvRow } from "@/lib/validation/schemas";

export interface FieldDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface EpisodeDiffItem {
  globalId: string;
  codeSerie: string;
  title: string;
  type: "CREATE" | "UPDATE" | "UNCHANGED" | "MISSING_IN_CSV";
  diffs: FieldDiff[];
  data: CsvRow | any;
}

export interface CsvDiffReport {
  summary: {
    totalIncoming: number;
    toCreate: number;
    toUpdate: number;
    unchanged: number;
    missingInCsv: number;
    duplicateErrors: string[];
  };
  items: EpisodeDiffItem[];
  canProceed: boolean;
}

export function generateCsvDiff(
  incomingRows: CsvRow[],
  existingEpisodes: Array<{
    globalId: string;
    codeSerie: string;
    title: string;
    conceptPlaylist: string;
    thumbnailText?: string | null;
    thumbnailVisual?: string | null;
    hook?: string | null;
    keywords?: string | null;
    description?: string | null;
  }>
): CsvDiffReport {
  const existingMapByGlobalId = new Map(existingEpisodes.map((ep) => [ep.globalId, ep]));
  const existingMapByCode = new Map(existingEpisodes.map((ep) => [ep.codeSerie, ep]));
  const seenGlobalIds = new Set<string>();
  const duplicateErrors: string[] = [];

  const items: EpisodeDiffItem[] = [];
  const processedExistingGlobalIds = new Set<string>();

  let toCreateCount = 0;
  let toUpdateCount = 0;
  let unchangedCount = 0;

  for (let i = 0; i < incomingRows.length; i++) {
    const row = incomingRows[i];
    const globalId = row["ID Global"];
    const codeSerie = row["Code Série"];

    // Check duplicate globalId in CSV
    if (seenGlobalIds.has(globalId)) {
      duplicateErrors.push(`Duplicate ID Global "${globalId}" at row ${i + 1}`);
    }
    seenGlobalIds.add(globalId);

    // Find in existing
    const existing = existingMapByGlobalId.get(globalId) || existingMapByCode.get(codeSerie);

    if (!existing) {
      toCreateCount++;
      items.push({
        globalId,
        codeSerie,
        title: row["Titre de la Vidéo"],
        type: "CREATE",
        diffs: [],
        data: row,
      });
    } else {
      processedExistingGlobalIds.add(existing.globalId);
      const diffs: FieldDiff[] = [];

      const checkField = (field: string, oldVal: string | null | undefined, newVal: string) => {
        const o = (oldVal || "").trim();
        const n = (newVal || "").trim();
        if (o !== n) {
          diffs.push({ field, oldValue: o, newValue: n });
        }
      };

      checkField("Code Série", existing.codeSerie, row["Code Série"]);
      checkField("Titre de la Vidéo", existing.title, row["Titre de la Vidéo"]);
      checkField("Concept / Playlist", existing.conceptPlaylist, row["Concept / Playlist"]);
      checkField("Texte Miniature", existing.thumbnailText, row["Texte Miniature"]);
      checkField("Visuel Miniature", existing.thumbnailVisual, row["Visuel Miniature"]);
      checkField("Hook (0-15s)", existing.hook, row["Hook (0-15s)"]);
      checkField("Mots-Clés (15 tags)", existing.keywords, row["Mots-Clés (15 tags)"]);
      checkField("Description Complète", existing.description, row["Description Complète"]);

      if (diffs.length > 0) {
        toUpdateCount++;
        items.push({
          globalId,
          codeSerie,
          title: row["Titre de la Vidéo"],
          type: "UPDATE",
          diffs,
          data: row,
        });
      } else {
        unchangedCount++;
        items.push({
          globalId,
          codeSerie,
          title: row["Titre de la Vidéo"],
          type: "UNCHANGED",
          diffs: [],
          data: row,
        });
      }
    }
  }

  // Find existing episodes that are not in the incoming CSV
  let missingInCsvCount = 0;
  for (const ep of existingEpisodes) {
    if (!processedExistingGlobalIds.has(ep.globalId)) {
      missingInCsvCount++;
      items.push({
        globalId: ep.globalId,
        codeSerie: ep.codeSerie,
        title: ep.title,
        type: "MISSING_IN_CSV",
        diffs: [],
        data: ep,
      });
    }
  }

  return {
    summary: {
      totalIncoming: incomingRows.length,
      toCreate: toCreateCount,
      toUpdate: toUpdateCount,
      unchanged: unchangedCount,
      missingInCsv: missingInCsvCount,
      duplicateErrors,
    },
    items,
    canProceed: duplicateErrors.length === 0,
  };
}
