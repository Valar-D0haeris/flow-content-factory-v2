import Papa from "papaparse";
import { CsvRow } from "@/lib/validation/schemas";

export interface ParsedCsvResult {
  rows: CsvRow[];
  headers: string[];
  errors: string[];
  totalParsed: number;
}

export const EXPECTED_COLUMNS = [
  "ID Global",
  "Code Série",
  "Titre de la Vidéo",
  "Concept / Playlist",
  "Texte Miniature",
  "Visuel Miniature",
  "Hook (0-15s)",
  "Mots-Clés (15 tags)",
  "Description Complète",
] as const;

/**
 * Parses raw CSV string or file content into structured objects.
 */
export function parsePlanningCsv(csvContent: string): ParsedCsvResult {
  const errors: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(`Row ${err.row ?? "?"}: ${err.message}`);
    }
  }

  const headers = parsed.meta.fields || [];
  
  // Validate headers against required columns
  for (const reqCol of EXPECTED_COLUMNS.slice(0, 4)) {
    if (!headers.includes(reqCol)) {
      errors.push(`Missing mandatory column header: "${reqCol}"`);
    }
  }

  const rows: CsvRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const rawRow = parsed.data[i];
    
    // Check if row has at least an ID Global or Code Série
    const idGlobal = (rawRow["ID Global"] || "").trim();
    const codeSerie = (rawRow["Code Série"] || "").trim();
    const titre = (rawRow["Titre de la Vidéo"] || "").trim();
    const concept = (rawRow["Concept / Playlist"] || "").trim();

    if (!idGlobal && !codeSerie && !titre) {
      continue; // empty row skipped
    }

    if (!idGlobal) {
      errors.push(`Row ${i + 1}: Missing "ID Global"`);
    }
    if (!codeSerie) {
      errors.push(`Row ${i + 1}: Missing "Code Série"`);
    }
    if (!titre) {
      errors.push(`Row ${i + 1}: Missing "Titre de la Vidéo"`);
    }
    if (!concept) {
      errors.push(`Row ${i + 1}: Missing "Concept / Playlist"`);
    }

    rows.push({
      "ID Global": idGlobal,
      "Code Série": codeSerie,
      "Titre de la Vidéo": titre,
      "Concept / Playlist": concept,
      "Texte Miniature": (rawRow["Texte Miniature"] || "").trim(),
      "Visuel Miniature": (rawRow["Visuel Miniature"] || "").trim(),
      "Hook (0-15s)": (rawRow["Hook (0-15s)"] || "").trim(),
      "Mots-Clés (15 tags)": (rawRow["Mots-Clés (15 tags)"] || "").trim(),
      "Description Complète": (rawRow["Description Complète"] || "").trim(),
    });
  }

  return {
    rows,
    headers,
    errors,
    totalParsed: rows.length,
  };
}
