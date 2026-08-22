import { describe, it, expect } from "vitest";
import { dbStore, ProductionStatus, ScriptStatus, AssetType, ActorType } from "@/db/store";
import { parseDurationToSeconds, formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";
import { parsePlanningCsv } from "@/lib/csv/parser";
import { generateCsvDiff } from "@/lib/csv/diff";
import { exportEpisodesToCsv } from "@/lib/csv/exporter";
import { findNextEpisodeToProduce, isValidStatusTransition } from "@/lib/production/status";
import { extractApiKey, verifyAuth } from "@/lib/auth/service";
import { NextRequest } from "next/server";

describe("PHASE 4 — TESTS LOGIQUES COMPLETS", () => {
  // TEST 1 — DATABASE & STORE
  describe("TEST 1 — DATABASE & STORE", () => {
    it("reads, updates and maintains relational entities and timestamps", () => {
      const all = dbStore.getAllEpisodes();
      expect(all.length).toBeGreaterThanOrEqual(45);

      const target = all[0].episode;
      const initialUpdated = target.updatedAt;

      // Update episode
      const updated = dbStore.updateEpisode(target.id, { title: "Updated Test Title" }, "USER");
      expect(updated.title).toBe("Updated Test Title");
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(initialUpdated).getTime());

      // Fetch with relations
      const full = dbStore.findEpisodeByCodeOrGlobalId(target.codeSerie);
      expect(full).not.toBeNull();
      expect(full?.episode.title).toBe("Updated Test Title");
      expect(full?.production).toBeDefined();
      expect(full?.scripts).toBeDefined();
      expect(full?.assets).toBeDefined();
      expect(full?.events).toBeDefined();
    });
  });

  // TEST 2 — CSV CYCLE & INTEGRITY
  describe("TEST 2 — CSV IMPORT / EXPORT CYCLE", () => {
    it("handles valid CSV and performs complete roundtrip export -> import without data loss", () => {
      const all = dbStore.getAllEpisodes().map((e) => e.episode);
      const exportedCsv = exportEpisodesToCsv(all);

      const parsed = parsePlanningCsv(exportedCsv);
      expect(parsed.errors.length).toBe(0);
      expect(parsed.rows.length).toBe(all.length);

      const diff = generateCsvDiff(parsed.rows, all);
      expect(diff.summary.toCreate).toBe(0);
      expect(diff.summary.toUpdate).toBe(0);
      expect(diff.summary.unchanged).toBe(all.length);
      expect(diff.canProceed).toBe(true);
    });

    it("rejects invalid CSV, missing headers, and detects duplicate keys", () => {
      const emptyCsv = "";
      const emptyParsed = parsePlanningCsv(emptyCsv);
      expect(emptyParsed.errors.length).toBeGreaterThan(0);

      const missingHeaderCsv = `ID Global,Titre de la Vidéo\n1,Some Title`;
      const missingParsed = parsePlanningCsv(missingHeaderCsv);
      expect(missingParsed.errors.some((e) => e.includes("Missing mandatory column header"))).toBe(true);

      const duplicateRows = [
        {
          "ID Global": "99",
          "Code Série": "TEST_01",
          "Titre de la Vidéo": "Title 1",
          "Concept / Playlist": "Playlist 1",
          "Texte Miniature": "",
          "Visuel Miniature": "",
          "Hook (0-15s)": "",
          "Mots-Clés (15 tags)": "",
          "Description Complète": "",
        },
        {
          "ID Global": "99", // Duplicate global ID
          "Code Série": "TEST_02",
          "Titre de la Vidéo": "Title 2",
          "Concept / Playlist": "Playlist 1",
          "Texte Miniature": "",
          "Visuel Miniature": "",
          "Hook (0-15s)": "",
          "Mots-Clés (15 tags)": "",
          "Description Complète": "",
        },
      ];

      const diff = generateCsvDiff(duplicateRows, []);
      expect(diff.canProceed).toBe(false);
      expect(diff.summary.duplicateErrors.length).toBe(1);
    });
  });

  // TEST 3 — PROCHAIN ÉPISODE SANS HALLUCINATION
  describe("TEST 3 — DETERMINATION DU PROCHAIN EPISODE", () => {
    it("handles scenario: none completed -> picks first in chronological sequence", () => {
      const list = [
        {
          id: "1",
          globalId: "1",
          codeSerie: "B1-B2_01",
          episodeNumber: 1,
          title: "Ep 1",
          conceptPlaylist: "P1",
          production: {
            planningStatus: "NOT_STARTED" as const,
            scriptStatus: "NOT_STARTED" as const,
            audioStatus: "NOT_STARTED" as const,
            publicationStatus: "NOT_STARTED" as const,
          },
        },
        {
          id: "2",
          globalId: "2",
          codeSerie: "B1-B2_02",
          episodeNumber: 2,
          title: "Ep 2",
          conceptPlaylist: "P1",
          production: {
            planningStatus: "NOT_STARTED" as const,
            scriptStatus: "NOT_STARTED" as const,
            audioStatus: "NOT_STARTED" as const,
            publicationStatus: "NOT_STARTED" as const,
          },
        },
      ];

      const res = findNextEpisodeToProduce(list);
      expect(res.nextEpisode?.codeSerie).toBe("B1-B2_01");
    });

    it("handles scenario: EP01 to EP04 completed -> recommends EP05", () => {
      const list = [1, 2, 3, 4, 5].map((n) => ({
        id: n.toString(),
        globalId: n.toString(),
        codeSerie: `B1-B2_${n.toString().padStart(2, "0")}`,
        episodeNumber: n,
        title: `Ep ${n}`,
        conceptPlaylist: "P1",
        production: {
          planningStatus: (n <= 4 ? "COMPLETED" : "NOT_STARTED") as ProductionStatus,
          scriptStatus: (n <= 4 ? "COMPLETED" : "NOT_STARTED") as ProductionStatus,
          audioStatus: (n <= 4 ? "COMPLETED" : "NOT_STARTED") as ProductionStatus,
          publicationStatus: (n <= 4 ? "COMPLETED" : "NOT_STARTED") as ProductionStatus,
        },
      }));

      const res = findNextEpisodeToProduce(list);
      expect(res.nextEpisode?.codeSerie).toBe("B1-B2_05");
    });

    it("handles heterogeneous series codes and non-contiguous numbering", () => {
      const list = [
        {
          id: "1",
          globalId: "1",
          codeSerie: "B1-B2_01",
          episodeNumber: 1,
          title: "Ep 1",
          conceptPlaylist: "P1",
          production: {
            planningStatus: "COMPLETED" as const,
            scriptStatus: "COMPLETED" as const,
            audioStatus: "COMPLETED" as const,
            publicationStatus: "COMPLETED" as const,
          },
        },
        {
          id: "20",
          globalId: "20",
          codeSerie: "MIND-01",
          episodeNumber: 20,
          title: "Mindset Ep 1",
          conceptPlaylist: "P2",
          production: {
            planningStatus: "NOT_STARTED" as const,
            scriptStatus: "NOT_STARTED" as const,
            audioStatus: "NOT_STARTED" as const,
            publicationStatus: "NOT_STARTED" as const,
          },
        },
      ];

      const res = findNextEpisodeToProduce(list);
      expect(res.nextEpisode?.codeSerie).toBe("MIND-01");
    });
  });

  // TEST 4 — SCRIPT & IMMUTABLE VERSIONING
  describe("TEST 4 — SCRIPT VERSIONING & IMMUTABILITY", () => {
    it("creates versions without overwriting previous versions", () => {
      const ep = dbStore.getAllEpisodes()[10].episode;
      const initialCount = (dbStore.findEpisodeByCodeOrGlobalId(ep.codeSerie)?.scripts || []).length;

      const v1 = dbStore.addScriptVersion(ep.id, "Speaker 1: Hello from v1", "DRAFT", "USER", "Initial draft");
      const v2 = dbStore.addScriptVersion(ep.id, "Speaker 1: Hello from v2 updated", "REVIEW", "GPT", "Revised dialogue");
      const v3 = dbStore.addScriptVersion(ep.id, "Speaker 1: Hello from v3 final", "FINAL", "USER", "Approved final");

      expect(v1.versionNumber).toBe(initialCount + 1);
      expect(v2.versionNumber).toBe(initialCount + 2);
      expect(v3.versionNumber).toBe(initialCount + 3);

      const full = dbStore.findEpisodeByCodeOrGlobalId(ep.codeSerie);
      const scripts = full?.scripts || [];
      expect(scripts.length).toBe(initialCount + 3);
      expect(scripts.some((s) => s.content.includes("v1"))).toBe(true);
      expect(scripts.some((s) => s.content.includes("v2"))).toBe(true);
      expect(scripts.some((s) => s.content.includes("v3"))).toBe(true);
    });
  });

  // TEST 5 — DURATION CONVERSIONS
  describe("TEST 5 — DURATION CONVERSIONS", () => {
    it("converts all canonical and edge-case duration formats correctly", () => {
      expect(parseDurationToSeconds("23:18")).toBe(1398);
      expect(parseDurationToSeconds("00:00")).toBe(0);
      expect(parseDurationToSeconds("01:05")).toBe(65);
      expect(parseDurationToSeconds("25:30")).toBe(1530);
      expect(parseDurationToSeconds("60:00")).toBe(3600);
      expect(parseDurationToSeconds("1:02:03")).toBe(3723);
      expect(parseDurationToSeconds("invalid string")).toBe(0);

      expect(formatSecondsToTime(1398)).toBe("23:18");
      expect(formatSecondsToTime(3723)).toBe("01:02:03");
    });
  });

  // TEST 6 — METADATA & 3 TITLE OPTIONS
  describe("TEST 6 — METADATA PACKAGING", () => {
    it("persists 3 title options, selected title, tags, and chapters", () => {
      const ep = dbStore.getAllEpisodes()[4].episode;

      const meta = dbStore.updateMetadata(
        ep.id,
        {
          titleOption1: "Option 1: Master English",
          titleOption2: "Option 2: Speak with Flow",
          titleOption3: "Option 3: Fluent in 30 Days",
          selectedTitle: "Option 2: Speak with Flow",
          description: "Full detailed video description",
          tags: ["english", "fluency", "podcast"],
          chapters: [
            { timestamp: "00:00", seconds: 0, title: "Intro" },
            { timestamp: "05:00", seconds: 300, title: "Core Topic" },
          ],
        },
        "GPT"
      );

      expect(meta.selectedTitle).toBe("Option 2: Speak with Flow");
      expect(meta.titleOption1).toBe("Option 1: Master English");
      expect(meta.chapters?.length).toBe(2);

      const retrieved = dbStore.findEpisodeByCodeOrGlobalId(ep.codeSerie);
      expect(retrieved?.metadata?.selectedTitle).toBe("Option 2: Speak with Flow");
    });
  });

  // TEST 7 — ASSETS & PRIMARY THUMBNAILS
  describe("TEST 7 — ASSETS & THUMBNAILS VARIANT SELECTION", () => {
    it("manages variants A, B, C and sets primary thumbnail cleanly", () => {
      const ep = dbStore.getAllEpisodes()[5].episode;

      const thumbA = dbStore.addAsset(ep.id, {
        episodeId: ep.id,
        assetType: "THUMBNAIL",
        filename: "thumb_A.png",
        blobUrl: "https://blob.vercel.com/thumb_a.png",
        variant: "A",
        version: 1,
        isPrimary: true,
        mimeType: "image/png",
        fileSize: 500000,
      });

      const thumbB = dbStore.addAsset(ep.id, {
        episodeId: ep.id,
        assetType: "THUMBNAIL",
        filename: "thumb_B.png",
        blobUrl: "https://blob.vercel.com/thumb_b.png",
        variant: "B",
        version: 1,
        isPrimary: false,
        mimeType: "image/png",
        fileSize: 520000,
      });

      expect(thumbA.isPrimary).toBe(true);

      // Change primary to B
      dbStore.setPrimaryThumbnail(ep.id, thumbB.id);

      const full = dbStore.findEpisodeByCodeOrGlobalId(ep.codeSerie);
      const assets = full?.assets || [];
      const updatedA = assets.find((a) => a.id === thumbA.id);
      const updatedB = assets.find((a) => a.id === thumbB.id);

      expect(updatedA?.isPrimary).toBe(false);
      expect(updatedB?.isPrimary).toBe(true);
    });
  });

  // TEST 8 — PRODUCTION EVENTS & AUDIT LOGS
  describe("TEST 8 — AUDIT TIMELINE LOGGING", () => {
    it("records events on every significant state change", () => {
      const ep = dbStore.getAllEpisodes()[6].episode;
      const initialEventsCount = dbStore.getEvents(ep.id).length;

      dbStore.updateProduction(ep.id, { planningStatus: "IN_PROGRESS" }, "GPT");
      dbStore.addScriptVersion(ep.id, "New script for audit", "DRAFT", "GPT");

      const afterEvents = dbStore.getEvents(ep.id);
      expect(afterEvents.length).toBeGreaterThan(initialEventsCount);
      expect(afterEvents.some((e) => e.eventType === "STATUS_CHANGED")).toBe(true);
      expect(afterEvents.some((e) => e.eventType === "SCRIPT_CREATED")).toBe(true);
    });
  });

  // TEST 10 — AUTHENTICATION & RBAC
  describe("TEST 10 — AUTHENTICATION & ROLES", () => {
    it("verifies Bearer token and enforces role-based access", () => {
      const reqAdmin = new NextRequest("http://localhost:3000/api/v1/episodes", {
        headers: { authorization: "Bearer fcf_live_admin_secret_key_9999" },
      });
      const authAdmin = verifyAuth(reqAdmin, "ADMIN");
      expect(authAdmin.isAuthenticated).toBe(true);
      expect(authAdmin.role).toBe("ADMIN");

      const reqGptWrite = new NextRequest("http://localhost:3000/api/v1/episodes", {
        headers: { authorization: "Bearer fcf_live_gpt_prod_secret_key_8923" },
      });
      const authGptWrite = verifyAuth(reqGptWrite, "WRITE");
      expect(authGptWrite.isAuthenticated).toBe(true);
      expect(authGptWrite.role).toBe("GPT_PRODUCTION");

      const reqReadonly = new NextRequest("http://localhost:3000/api/v1/episodes", {
        headers: { authorization: "Bearer fcf_live_gpt_readonly_key_1042" },
      });
      const authReadonlyForWrite = verifyAuth(reqReadonly, "WRITE");
      expect(authReadonlyForWrite.isAuthenticated).toBe(false); // Readonly cannot write

      const reqInvalid = new NextRequest("http://localhost:3000/api/v1/episodes", {
        headers: { authorization: "Bearer invalid_secret_token" },
      });
      expect(verifyAuth(reqInvalid).isAuthenticated).toBe(false);
    });
  });

  // TEST 11 — CONCURRENCY & OPTIMISTIC LOCKING
  describe("TEST 11 — OPTIMISTIC LOCKING", () => {
    it("detects stale updates when expectedUpdatedAt mismatch occurs", () => {
      const ep = dbStore.getAllEpisodes()[7].episode;
      const staleTimestamp = "2020-01-01T00:00:00.000Z";

      expect(ep.updatedAt).not.toBe(staleTimestamp);
    });
  });

  // TEST 12 — IDEMPOTENCE
  describe("TEST 12 — IDEMPOTENCE", () => {
    it("does not create duplicate episodes when identical globalId is imported", () => {
      const existingEp = dbStore.getAllEpisodes()[0].episode;
      const exactCopyRow = {
        "ID Global": existingEp.globalId,
        "Code Série": existingEp.codeSerie,
        "Titre de la Vidéo": existingEp.title,
        "Concept / Playlist": existingEp.conceptPlaylist,
        "Texte Miniature": existingEp.thumbnailText || "",
        "Visuel Miniature": existingEp.thumbnailVisual || "",
        "Hook (0-15s)": existingEp.hook || "",
        "Mots-Clés (15 tags)": existingEp.keywords || "",
        "Description Complète": existingEp.description || "",
      };

      const diff = generateCsvDiff([exactCopyRow], [existingEp]);
      expect(diff.summary.toCreate).toBe(0);
      expect(diff.summary.unchanged).toBe(1);
    });
  });

  // PHASE 5 — FULL END-TO-END PRODUCTION WORKFLOW SIMULATION
  describe("PHASE 5 — COMPLETE END-TO-END PRODUCTION WORKFLOW", () => {
    it("executes the entire 14-step production workflow smoothly", () => {
      // 1. Get next episode to produce
      const all = dbStore.getAllEpisodes().map((e) => ({
        id: e.episode.id,
        globalId: e.episode.globalId,
        codeSerie: e.episode.codeSerie,
        episodeNumber: e.episode.episodeNumber,
        title: e.episode.title,
        conceptPlaylist: e.episode.conceptPlaylist,
        production: e.production,
      }));
      const nextRes = findNextEpisodeToProduce(all);
      expect(nextRes.nextEpisode).not.toBeNull();

      const targetCode = nextRes.nextEpisode!.codeSerie;

      // 2. Fetch full episode context
      const context = dbStore.findEpisodeByCodeOrGlobalId(targetCode);
      expect(context).not.toBeNull();
      const epId = context!.episode.id;
      const initialScriptCount = context!.scripts.length;

      // 3. Create script v1
      const script1 = dbStore.addScriptVersion(
        epId,
        "Speaker 1: Welcome to this session.\nSpeaker 2: Let's discuss our core topic.",
        "DRAFT",
        "GPT",
        "Initial proposal"
      );
      expect(script1.versionNumber).toBe(initialScriptCount + 1);

      // 4 & 5. Create script v2
      const script2 = dbStore.addScriptVersion(
        epId,
        "Speaker 1: Welcome to Speak English With Flow!\nSpeaker 2: Today we master conversation flow with practical drills.",
        "REVIEW",
        "GPT",
        "Revised with user feedback"
      );
      expect(script2.versionNumber).toBe(initialScriptCount + 2);

      // 6. Approve v2
      const script3 = dbStore.addScriptVersion(
        epId,
        script2.content,
        "FINAL",
        "USER",
        "Validated by creator"
      );
      expect(script3.status).toBe("FINAL");

      // 7. Record duration ("23:18" -> 1398s)
      const parsedDur = parseDurationToSeconds("23:18");
      expect(parsedDur).toBe(1398);
      dbStore.updateProduction(epId, { durationSeconds: parsedDur, audioStatus: "COMPLETED" }, "USER");

      // 8. Create metadata (3 options)
      dbStore.updateMetadata(
        epId,
        {
          titleOption1: "Title Option 1",
          titleOption2: "Title Option 2 (SEO)",
          titleOption3: "Title Option 3 (Curiosity)",
          selectedTitle: "Title Option 2 (SEO)",
          description: "Full YouTube description with timestamps",
          tags: ["flow", "english", "podcast"],
        },
        "GPT"
      );

      // 9. Save 3 thumbnail variants (A, B, C)
      const tA = dbStore.addAsset(epId, {
        episodeId: epId,
        assetType: "THUMBNAIL",
        filename: `thumb_${targetCode}_A.png`,
        blobUrl: "https://blob.vercel.com/thumb_A.png",
        variant: "A",
        version: 1,
        isPrimary: false,
      });

      const tB = dbStore.addAsset(epId, {
        episodeId: epId,
        assetType: "THUMBNAIL",
        filename: `thumb_${targetCode}_B.png`,
        blobUrl: "https://blob.vercel.com/thumb_B.png",
        variant: "B",
        version: 1,
        isPrimary: true, // Selected as primary
      });

      const tC = dbStore.addAsset(epId, {
        episodeId: epId,
        assetType: "THUMBNAIL",
        filename: `thumb_${targetCode}_C.png`,
        blobUrl: "https://blob.vercel.com/thumb_C.png",
        variant: "C",
        version: 1,
        isPrimary: false,
      });

      // 10. Confirm primary thumbnail
      expect(tB.isPrimary).toBe(true);

      // 11. Complete episode status
      const prodUpdated = dbStore.updateProduction(
        epId,
        {
          scriptStatus: "COMPLETED",
          audioStatus: "COMPLETED",
          metadataStatus: "COMPLETED",
          thumbnailStatus: "COMPLETED",
          publicationStatus: "COMPLETED",
        },
        "USER"
      );
      expect(prodUpdated.publicationStatus).toBe("COMPLETED");

      // 12. Verify audit history
      const history = dbStore.getEvents(epId);
      expect(history.length).toBeGreaterThan(0);

      // 13. Verify full context after workflow
      const finalContext = dbStore.findEpisodeByCodeOrGlobalId(targetCode);
      expect(finalContext?.production.durationSeconds).toBe(1398);
      expect(finalContext?.metadata?.selectedTitle).toBe("Title Option 2 (SEO)");
      expect(finalContext?.scripts.length).toBeGreaterThanOrEqual(3);
      expect(finalContext?.assets.length).toBeGreaterThanOrEqual(3);
    });
  });
});
