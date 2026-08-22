import Papa from "papaparse";
import { EXPECTED_COLUMNS } from "./parser";

export interface ExportableEpisode {
  globalId: string;
  codeSerie: string;
  episodeNumber?: number;
  title: string;
  conceptPlaylist: string;
  thumbnailText?: string | null;
  thumbnailVisual?: string | null;
  hook?: string | null;
  keywords?: string | null;
  description?: string | null;
}

/**
 * Deterministic CSV Exporter matching the exact 9-column editorial specification.
 */
export function exportEpisodesToCsv(episodes: ExportableEpisode[]): string {
  // Sort deterministically by episodeNumber or numeric globalId
  const sorted = [...episodes].sort((a, b) => {
    if (a.episodeNumber !== undefined && b.episodeNumber !== undefined && a.episodeNumber !== b.episodeNumber) {
      return a.episodeNumber - b.episodeNumber;
    }
    const numA = parseInt(a.globalId, 10);
    const numB = parseInt(b.globalId, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.globalId.localeCompare(b.globalId);
  });

  const rows = sorted.map((ep) => ({
    "ID Global": ep.globalId,
    "Code Série": ep.codeSerie,
    "Titre de la Vidéo": ep.title,
    "Concept / Playlist": ep.conceptPlaylist,
    "Texte Miniature": ep.thumbnailText || "",
    "Visuel Miniature": ep.thumbnailVisual || "",
    "Hook (0-15s)": ep.hook || "",
    "Mots-Clés (15 tags)": ep.keywords || "",
    "Description Complète": ep.description || "",
  }));

  return Papa.unparse(rows, {
    columns: [...EXPECTED_COLUMNS],
    quotes: true,
    newline: "\r\n",
  });
}
