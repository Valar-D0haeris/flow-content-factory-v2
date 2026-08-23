import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf-8");
    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        let val = v.join("=").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

interface MigrationStats {
  created: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: number;
}

export async function runMigration(isDryRun: boolean = true) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not configured in .env.local");
  }

  const storePath = path.resolve(process.cwd(), ".data_store.json");
  if (!fs.existsSync(storePath)) {
    throw new Error(".data_store.json not found");
  }

  const raw = fs.readFileSync(storePath, "utf-8");
  const storeData = JSON.parse(raw);

  const sql = neon(dbUrl);

  console.log(`=======================================================`);
  console.log(`MIGRATION STORE (.data_store.json) -> NEON POSTGRESQL`);
  console.log(`MODE: ${isDryRun ? "DRY-RUN (Simulation seule)" : "EXECUTION RÉELLE (Écriture idempotente)"}`);
  console.log(`=======================================================\n`);

  // 1. Fetch all episodes from Neon to build ID mapping: localId ("ep_001") -> Neon UUID
  const neonEpisodes = await sql`
    SELECT id, global_id, code_serie, episode_number, title, concept_playlist, updated_at
    FROM episodes
  `;
  console.log(`Episodes existants dans Neon: ${neonEpisodes.length}`);

  const localIdToNeonId = new Map<string, string>();
  const globalIdToNeonEpisode = new Map<string, any>();

  neonEpisodes.forEach((ep) => {
    globalIdToNeonEpisode.set(ep.global_id, ep);
  });

  storeData.episodes?.forEach((localEp: any) => {
    const neonEp = globalIdToNeonEpisode.get(localEp.globalId);
    if (neonEp) {
      localIdToNeonId.set(localEp.id, neonEp.id);
    }
  });

  console.log(`Episodes mappés local -> Neon: ${localIdToNeonId.size} / ${storeData.episodes?.length || 0}\n`);

  const report: Record<string, MigrationStats> = {
    episode_production: { created: 0, updated: 0, skipped: 0, conflicts: 0, errors: 0 },
    script_versions: { created: 0, updated: 0, skipped: 0, conflicts: 0, errors: 0 },
    episode_metadata: { created: 0, updated: 0, skipped: 0, conflicts: 0, errors: 0 },
    assets: { created: 0, updated: 0, skipped: 0, conflicts: 0, errors: 0 },
    production_events: { created: 0, updated: 0, skipped: 0, conflicts: 0, errors: 0 },
  };

  // 2. Process episode_production
  const existingProds = await sql`SELECT id, episode_id, planning_status, script_status, publication_status FROM episode_production`;
  const existingProdByEpisodeId = new Map<string, any>();
  existingProds.forEach((p) => existingProdByEpisodeId.set(p.episode_id, p));

  for (const p of storeData.production || []) {
    const neonEpId = localIdToNeonId.get(p.episodeId);
    if (!neonEpId) {
      report.episode_production.errors++;
      continue;
    }

    const existing = existingProdByEpisodeId.get(neonEpId);
    if (!existing) {
      report.episode_production.created++;
      if (!isDryRun) {
        await sql`
          INSERT INTO episode_production (
            episode_id, planning_status, script_status, review_status,
            audio_status, metadata_status, thumbnail_status, publication_status,
            duration_seconds, started_at, completed_at, created_at, updated_at
          ) VALUES (
            ${neonEpId}, ${p.planningStatus || "NOT_STARTED"}, ${p.scriptStatus || "NOT_STARTED"}, ${p.reviewStatus || "NOT_STARTED"},
            ${p.audioStatus || "NOT_STARTED"}, ${p.metadataStatus || "NOT_STARTED"}, ${p.thumbnailStatus || "NOT_STARTED"}, ${p.publicationStatus || "NOT_STARTED"},
            ${p.durationSeconds || 0}, ${p.startedAt || null}, ${p.completedAt || null}, ${p.createdAt || new Date().toISOString()}, ${p.updatedAt || new Date().toISOString()}
          )
        `;
      }
    } else {
      // Comparison
      const isIdentical =
        existing.planning_status === p.planningStatus &&
        existing.script_status === p.scriptStatus &&
        existing.publication_status === p.publicationStatus;
      if (isIdentical) {
        report.episode_production.skipped++;
      } else {
        report.episode_production.conflicts++;
      }
    }
  }

  // 3. Process script_versions
  const existingScripts = await sql`SELECT id, episode_id, version_number, content FROM script_versions`;
  const scriptKeySet = new Set<string>();
  existingScripts.forEach((s) => scriptKeySet.add(`${s.episode_id}_v${s.version_number}`));

  for (const s of storeData.scripts || []) {
    const neonEpId = localIdToNeonId.get(s.episodeId);
    if (!neonEpId) {
      report.script_versions.errors++;
      continue;
    }

    const key = `${neonEpId}_v${s.versionNumber}`;
    if (!scriptKeySet.has(key)) {
      report.script_versions.created++;
      if (!isDryRun) {
        await sql`
          INSERT INTO script_versions (
            episode_id, version_number, status, content,
            storage_url, word_count, character_count, estimated_duration_seconds,
            created_by, notes, created_at
          ) VALUES (
            ${neonEpId}, ${s.versionNumber}, ${s.status || "DRAFT"}, ${s.content},
            ${s.storageUrl || null}, ${s.wordCount || 0}, ${s.characterCount || 0}, ${s.estimatedDurationSeconds || 0},
            ${s.createdBy || "USER"}, ${s.notes || null}, ${s.createdAt || new Date().toISOString()}
          )
        `;
      }
    } else {
      report.script_versions.skipped++;
    }
  }

  // 4. Process episode_metadata
  const existingMeta = await sql`SELECT id, episode_id FROM episode_metadata`;
  const existingMetaByEp = new Set<string>();
  existingMeta.forEach((m) => existingMetaByEp.add(m.episode_id));

  for (const m of storeData.metadata || []) {
    const neonEpId = localIdToNeonId.get(m.episodeId);
    if (!neonEpId) {
      report.episode_metadata.errors++;
      continue;
    }

    if (!existingMetaByEp.has(neonEpId)) {
      report.episode_metadata.created++;
      if (!isDryRun) {
        await sql`
          INSERT INTO episode_metadata (
            episode_id, title_option_1, title_option_2, title_option_3,
            selected_title, description, chapters, tags, playlist,
            created_at, updated_at
          ) VALUES (
            ${neonEpId}, ${m.titleOption1 || null}, ${m.titleOption2 || null}, ${m.titleOption3 || null},
            ${m.selectedTitle || null}, ${m.description || null},
            ${m.chapters ? JSON.stringify(m.chapters) : null},
            ${m.tags ? JSON.stringify(m.tags) : null},
            ${m.playlist || null},
            ${m.createdAt || new Date().toISOString()}, ${m.updatedAt || new Date().toISOString()}
          )
        `;
      }
    } else {
      report.episode_metadata.skipped++;
    }
  }

  // 5. Process assets
  const existingAssets = await sql`SELECT id, episode_id, filename, blob_url FROM assets`;
  const assetKeySet = new Set<string>();
  existingAssets.forEach((a) => assetKeySet.add(`${a.episode_id}_${a.filename}`));

  for (const a of storeData.assets || []) {
    const neonEpId = localIdToNeonId.get(a.episodeId);
    if (!neonEpId) {
      report.assets.errors++;
      continue;
    }

    const key = `${neonEpId}_${a.filename}`;
    if (!assetKeySet.has(key)) {
      report.assets.created++;
      if (!isDryRun) {
        await sql`
          INSERT INTO assets (
            episode_id, asset_type, filename, blob_url,
            mime_type, file_size, variant, version, is_primary, created_at
          ) VALUES (
            ${neonEpId}, ${a.assetType}, ${a.filename}, ${a.blobUrl},
            ${a.mimeType || null}, ${a.fileSize || 0}, ${a.variant || null}, ${a.version || 1},
            ${a.isPrimary || false}, ${a.createdAt || new Date().toISOString()}
          )
        `;
      }
    } else {
      report.assets.skipped++;
    }
  }

  // 6. Process production_events
  const existingEvents = await sql`SELECT id, episode_id, event_type, created_at FROM production_events`;
  const eventKeySet = new Set<string>();
  existingEvents.forEach((e) => eventKeySet.add(`${e.episode_id}_${e.event_type}_${new Date(e.created_at).toISOString()}`));

  for (const ev of storeData.events || []) {
    const neonEpId = ev.episodeId ? localIdToNeonId.get(ev.episodeId) : null;
    const dateStr = ev.createdAt ? new Date(ev.createdAt).toISOString() : new Date().toISOString();
    const key = `${neonEpId}_${ev.eventType}_${dateStr}`;

    if (!eventKeySet.has(key)) {
      report.production_events.created++;
      if (!isDryRun) {
        await sql`
          INSERT INTO production_events (
            episode_id, event_type, actor_type, description,
            metadata_json, created_at
          ) VALUES (
            ${neonEpId || null}, ${ev.eventType}, ${ev.actorType || "SYSTEM"}, ${ev.description},
            ${ev.metadataJson ? JSON.stringify(ev.metadataJson) : null}, ${dateStr}
          )
        `;
      }
    } else {
      report.production_events.skipped++;
    }
  }

  console.log("=== RAPPORT D'INSERTION (LOCAL -> NEON) ===");
  console.table(report);

  return report;
}

// CLI Execution
const isConfirm = process.argv.includes("--confirm");
runMigration(!isConfirm)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Migration failure:", e);
    process.exit(1);
  });
