import { describe, it, expect } from "vitest";
import { parsePlanningCsv } from "@/lib/csv/parser";
import { generateCsvDiff } from "@/lib/csv/diff";
import { exportEpisodesToCsv } from "@/lib/csv/exporter";
import { generateFull45Episodes } from "@/db/seed-data";

describe("CSV Module (Parser, Diff, Exporter)", () => {
  it("exports and re-parses all 45 episodes without data loss", () => {
    const original45 = generateFull45Episodes();
    expect(original45.length).toBe(45);

    const mappedForExport = original45.map((row, idx) => ({
      globalId: row["ID Global"],
      codeSerie: row["Code Série"],
      episodeNumber: idx + 1,
      title: row["Titre de la Vidéo"],
      conceptPlaylist: row["Concept / Playlist"],
      thumbnailText: row["Texte Miniature"],
      thumbnailVisual: row["Visuel Miniature"],
      hook: row["Hook (0-15s)"],
      keywords: row["Mots-Clés (15 tags)"],
      description: row["Description Complète"],
    }));

    const exportedCsv = exportEpisodesToCsv(mappedForExport);
    expect(exportedCsv).toContain("ID Global");
    expect(exportedCsv).toContain("B1-B2_01");
    expect(exportedCsv).toContain("MIND-01");

    const reParsed = parsePlanningCsv(exportedCsv);
    expect(reParsed.errors.length).toBe(0);
    expect(reParsed.rows.length).toBe(45);
    expect(reParsed.rows[0]["Code Série"]).toBe("B1-B2_01");
    expect(reParsed.rows[0]["ID Global"]).toBe("1");
  });

  it("detects additions, modifications and unchanged rows in diff generator", () => {
    const existing = [
      {
        globalId: "1",
        codeSerie: "B1-B2_01",
        title: "Old Title",
        conceptPlaylist: "Intermediate Mastery (B1-B2)",
        thumbnailText: "Old Text",
        thumbnailVisual: "Old Visual",
        hook: "Old Hook",
        keywords: "tag1, tag2",
        description: "Old Desc",
      },
      {
        globalId: "2",
        codeSerie: "B1-B2_02",
        title: "Identical Title",
        conceptPlaylist: "Intermediate Mastery (B1-B2)",
        thumbnailText: "Text",
        thumbnailVisual: "Visual",
        hook: "Hook",
        keywords: "tags",
        description: "Desc",
      },
    ];

    const incoming = [
      // Row 1: Modified title and thumbnail
      {
        "ID Global": "1",
        "Code Série": "B1-B2_01",
        "Titre de la Vidéo": "New Updated Title",
        "Concept / Playlist": "Intermediate Mastery (B1-B2)",
        "Texte Miniature": "New Text",
        "Visuel Miniature": "Old Visual",
        "Hook (0-15s)": "Old Hook",
        "Mots-Clés (15 tags)": "tag1, tag2",
        "Description Complète": "Old Desc",
      },
      // Row 2: Unchanged
      {
        "ID Global": "2",
        "Code Série": "B1-B2_02",
        "Titre de la Vidéo": "Identical Title",
        "Concept / Playlist": "Intermediate Mastery (B1-B2)",
        "Texte Miniature": "Text",
        "Visuel Miniature": "Visual",
        "Hook (0-15s)": "Hook",
        "Mots-Clés (15 tags)": "tags",
        "Description Complète": "Desc",
      },
      // Row 3: New Episode
      {
        "ID Global": "3",
        "Code Série": "B1-B2_03",
        "Titre de la Vidéo": "Brand New Episode",
        "Concept / Playlist": "Intermediate Mastery (B1-B2)",
        "Texte Miniature": "New",
        "Visuel Miniature": "New",
        "Hook (0-15s)": "New",
        "Mots-Clés (15 tags)": "new tags",
        "Description Complète": "New desc",
      },
    ];

    const diff = generateCsvDiff(incoming, existing);

    expect(diff.summary.toCreate).toBe(1);
    expect(diff.summary.toUpdate).toBe(1);
    expect(diff.summary.unchanged).toBe(1);
    expect(diff.canProceed).toBe(true);

    const updatedItem = diff.items.find((i) => i.globalId === "1");
    expect(updatedItem?.type).toBe("UPDATE");
    expect(updatedItem?.diffs.some((d) => d.field === "Titre de la Vidéo")).toBe(true);
  });

  it("flags duplicate IDs in CSV with duplicate errors", () => {
    const incomingWithDuplicates = [
      {
        "ID Global": "1",
        "Code Série": "B1-B2_01",
        "Titre de la Vidéo": "Title 1",
        "Concept / Playlist": "P1",
        "Texte Miniature": "",
        "Visuel Miniature": "",
        "Hook (0-15s)": "",
        "Mots-Clés (15 tags)": "",
        "Description Complète": "",
      },
      {
        "ID Global": "1", // Duplicate ID
        "Code Série": "B1-B2_02",
        "Titre de la Vidéo": "Title 2",
        "Concept / Playlist": "P1",
        "Texte Miniature": "",
        "Visuel Miniature": "",
        "Hook (0-15s)": "",
        "Mots-Clés (15 tags)": "",
        "Description Complète": "",
      },
    ];

    const diff = generateCsvDiff(incomingWithDuplicates, []);
    expect(diff.canProceed).toBe(false);
    expect(diff.summary.duplicateErrors.length).toBeGreaterThan(0);
  });
});
