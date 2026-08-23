import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, or, sql, desc } from "drizzle-orm";
import * as schema from "./schema";
import {
  episodes,
  episodeProduction,
  scriptVersions,
  episodeMetadata,
  assets,
  productionEvents,
  ProductionStatus,
  ScriptStatus,
  AssetType,
  ActorType,
  EventType,
} from "./schema";
import { dbStore } from "./store";

const databaseUrl = process.env.DATABASE_URL;
const sqlClient = databaseUrl ? neon(databaseUrl) : null;
export const db = databaseUrl && sqlClient ? drizzle(sqlClient, { schema }) : null;

export interface CompleteEpisodeRecord {
  episode: typeof episodes.$inferSelect;
  production: typeof episodeProduction.$inferSelect;
  scripts: (typeof scriptVersions.$inferSelect)[];
  metadata: (typeof episodeMetadata.$inferSelect) | null;
  assets: (typeof assets.$inferSelect)[];
  events: (typeof productionEvents.$inferSelect)[];
  scriptsCount: number;
  assetsCount: number;
}

export class PostgresRepository {
  private isAvailable(): boolean {
    return !!db && !!sqlClient;
  }

  // 1. Get all episodes with production info
  async getAllEpisodes(filters?: {
    playlist?: string | null;
    status?: string | null;
    search?: string | null;
  }): Promise<CompleteEpisodeRecord[]> {
    if (!this.isAvailable()) {
      return dbStore.getAllEpisodes().map((item) => {
        const full = dbStore.findEpisodeByCodeOrGlobalId(item.episode.codeSerie);
        return {
          episode: item.episode as any,
          production: item.production as any,
          scripts: (full?.scripts || []) as any,
          metadata: (full?.metadata || null) as any,
          assets: (full?.assets || []) as any,
          events: (full?.events || []) as any,
          scriptsCount: item.scriptsCount,
          assetsCount: item.assetsCount,
        };
      });
    }

    try {
      const allEpisodes = await db!
        .select()
        .from(episodes)
        .orderBy(episodes.episodeNumber);

      const allProduction = await db!.select().from(episodeProduction);
      const prodMap = new Map(allProduction.map((p) => [p.episodeId, p]));

      const allScripts = await db!.select().from(scriptVersions).orderBy(desc(scriptVersions.versionNumber));
      const scriptsMap = new Map<string, (typeof scriptVersions.$inferSelect)[]>();
      allScripts.forEach((s) => {
        const list = scriptsMap.get(s.episodeId) || [];
        list.push(s);
        scriptsMap.set(s.episodeId, list);
      });

      const allAssets = await db!.select().from(assets);
      const assetsMap = new Map<string, (typeof assets.$inferSelect)[]>();
      allAssets.forEach((a) => {
        const list = assetsMap.get(a.episodeId) || [];
        list.push(a);
        assetsMap.set(a.episodeId, list);
      });

      const allMetadata = await db!.select().from(episodeMetadata);
      const metaMap = new Map(allMetadata.map((m) => [m.episodeId, m]));

      let results: CompleteEpisodeRecord[] = allEpisodes.map((ep) => {
        const prod = prodMap.get(ep.id) || {
          id: "",
          episodeId: ep.id,
          planningStatus: "NOT_STARTED" as ProductionStatus,
          scriptStatus: "NOT_STARTED" as ProductionStatus,
          reviewStatus: "NOT_STARTED" as ProductionStatus,
          audioStatus: "NOT_STARTED" as ProductionStatus,
          metadataStatus: "NOT_STARTED" as ProductionStatus,
          thumbnailStatus: "NOT_STARTED" as ProductionStatus,
          publicationStatus: "NOT_STARTED" as ProductionStatus,
          durationSeconds: 0,
          startedAt: null,
          completedAt: null,
          createdAt: ep.createdAt,
          updatedAt: ep.updatedAt,
        };

        const epScripts = scriptsMap.get(ep.id) || [];
        const epAssets = assetsMap.get(ep.id) || [];
        const epMeta = metaMap.get(ep.id) || null;

        return {
          episode: ep,
          production: prod,
          scripts: epScripts,
          metadata: epMeta,
          assets: epAssets,
          events: [],
          scriptsCount: epScripts.length,
          assetsCount: epAssets.length,
        };
      });

      if (filters?.playlist) {
        const q = filters.playlist.toLowerCase();
        results = results.filter((r) => r.episode.conceptPlaylist.toLowerCase().includes(q));
      }

      if (filters?.status) {
        results = results.filter(
          (r) =>
            r.production.planningStatus === filters.status ||
            r.production.scriptStatus === filters.status ||
            r.production.publicationStatus === filters.status
        );
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(
          (r) =>
            r.episode.title.toLowerCase().includes(q) ||
            r.episode.codeSerie.toLowerCase().includes(q) ||
            r.episode.globalId.toLowerCase().includes(q) ||
            (r.episode.keywords && r.episode.keywords.toLowerCase().includes(q))
        );
      }

      return results;
    } catch (err) {
      console.warn("Neon query failed in getAllEpisodes, falling back to store:", err);
      return dbStore.getAllEpisodes() as any;
    }
  }

  // 2. Find episode by codeSerie (e.g. "B1-B2_01", "MIND-01") or globalId (e.g. "EP#01", "EP01")
  async findEpisodeByCodeOrGlobalId(codeOrId: string): Promise<CompleteEpisodeRecord | null> {
    if (!this.isAvailable()) {
      const legacy = dbStore.findEpisodeByCodeOrGlobalId(codeOrId);
      if (!legacy) return null;
      return {
        ...legacy,
        scriptsCount: legacy.scripts.length,
        assetsCount: legacy.assets.length,
      } as any;
    }

    try {
      const clean = codeOrId.trim();
      const normalizedGlobalId = clean.startsWith("EP") && !clean.includes("#")
        ? `EP#${clean.slice(2).padStart(2, "0")}`
        : clean;

      const matchedEpisodes = await db!
        .select()
        .from(episodes)
        .where(
          or(
            sql`LOWER(${episodes.codeSerie}) = LOWER(${clean})`,
            sql`LOWER(${episodes.globalId}) = LOWER(${clean})`,
            sql`LOWER(${episodes.globalId}) = LOWER(${normalizedGlobalId})`,
            sql`${episodes.id}::text = ${clean}`
          )
        )
        .limit(1);

      if (!matchedEpisodes || matchedEpisodes.length === 0) {
        return null;
      }

      const ep = matchedEpisodes[0];

      // Fetch related records in parallel
      const [prodRows, scriptRows, metaRows, assetRows, eventRows] = await Promise.all([
        db!.select().from(episodeProduction).where(eq(episodeProduction.episodeId, ep.id)).limit(1),
        db!.select().from(scriptVersions).where(eq(scriptVersions.episodeId, ep.id)).orderBy(scriptVersions.versionNumber),
        db!.select().from(episodeMetadata).where(eq(episodeMetadata.episodeId, ep.id)).limit(1),
        db!.select().from(assets).where(eq(assets.episodeId, ep.id)).orderBy(assets.createdAt),
        db!.select().from(productionEvents).where(eq(productionEvents.episodeId, ep.id)).orderBy(desc(productionEvents.createdAt)).limit(10),
      ]);

      const prod = prodRows[0] || {
        id: "",
        episodeId: ep.id,
        planningStatus: "NOT_STARTED" as ProductionStatus,
        scriptStatus: "NOT_STARTED" as ProductionStatus,
        reviewStatus: "NOT_STARTED" as ProductionStatus,
        audioStatus: "NOT_STARTED" as ProductionStatus,
        metadataStatus: "NOT_STARTED" as ProductionStatus,
        thumbnailStatus: "NOT_STARTED" as ProductionStatus,
        publicationStatus: "NOT_STARTED" as ProductionStatus,
        durationSeconds: 0,
        startedAt: null,
        completedAt: null,
        createdAt: ep.createdAt,
        updatedAt: ep.updatedAt,
      };

      return {
        episode: ep,
        production: prod,
        scripts: scriptRows,
        metadata: metaRows[0] || null,
        assets: assetRows,
        events: eventRows,
        scriptsCount: scriptRows.length,
        assetsCount: assetRows.length,
      };
    } catch (err) {
      console.warn("Neon query failed in findEpisodeByCodeOrGlobalId, falling back to store:", err);
      const legacy = dbStore.findEpisodeByCodeOrGlobalId(codeOrId);
      if (!legacy) return null;
      return {
        ...legacy,
        scriptsCount: legacy.scripts.length,
        assetsCount: legacy.assets.length,
      } as any;
    }
  }

  // 3. Update production statuses
  async updateProduction(
    episodeIdOrCode: string,
    updates: Partial<typeof episodeProduction.$inferInsert>,
    actor: ActorType = "USER"
  ): Promise<typeof episodeProduction.$inferSelect> {
    if (!this.isAvailable()) {
      return dbStore.updateProduction(episodeIdOrCode, updates as any, actor) as any;
    }

    try {
      const full = await this.findEpisodeByCodeOrGlobalId(episodeIdOrCode);
      if (!full) {
        throw new Error(`Episode not found: ${episodeIdOrCode}`);
      }

      const epId = full.episode.id;
      const now = new Date();

      const existingProd = await db!
        .select()
        .from(episodeProduction)
        .where(eq(episodeProduction.episodeId, epId))
        .limit(1);

      let result: typeof episodeProduction.$inferSelect;

      if (existingProd.length === 0) {
        const [inserted] = await db!
          .insert(episodeProduction)
          .values({
            episodeId: epId,
            planningStatus: updates.planningStatus || "NOT_STARTED",
            scriptStatus: updates.scriptStatus || "NOT_STARTED",
            reviewStatus: updates.reviewStatus || "NOT_STARTED",
            audioStatus: updates.audioStatus || "NOT_STARTED",
            metadataStatus: updates.metadataStatus || "NOT_STARTED",
            thumbnailStatus: updates.thumbnailStatus || "NOT_STARTED",
            publicationStatus: updates.publicationStatus || "NOT_STARTED",
            durationSeconds: updates.durationSeconds || 0,
            startedAt: updates.startedAt || now,
            completedAt: updates.completedAt || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        result = inserted;
      } else {
        const [updated] = await db!
          .update(episodeProduction)
          .set({
            ...updates,
            updatedAt: now,
          })
          .where(eq(episodeProduction.episodeId, epId))
          .returning();
        result = updated;
      }

      // Log production event
      await this.logEvent({
        episodeId: epId,
        eventType: "STATUS_CHANGED",
        actorType: actor,
        description: `Production updated by ${actor}: ${JSON.stringify(updates)}`,
        metadataJson: updates,
      });

      // Keep legacy store synchronized in memory for safety
      try {
        dbStore.updateProduction(episodeIdOrCode, updates as any, actor);
      } catch {}

      return result;
    } catch (err) {
      console.warn("Neon updateProduction failed, using store fallback:", err);
      return dbStore.updateProduction(episodeIdOrCode, updates as any, actor) as any;
    }
  }

  // 4. Add script version
  async addScriptVersion(
    episodeIdOrCode: string,
    content: string,
    status: ScriptStatus = "DRAFT",
    createdBy: ActorType = "USER",
    notes?: string | null
  ): Promise<typeof scriptVersions.$inferSelect> {
    if (!this.isAvailable()) {
      return dbStore.addScriptVersion(episodeIdOrCode, content, status, createdBy, notes) as any;
    }

    try {
      const full = await this.findEpisodeByCodeOrGlobalId(episodeIdOrCode);
      if (!full) throw new Error(`Episode ${episodeIdOrCode} not found`);

      const epId = full.episode.id;
      const nextVersion = full.scripts.length + 1;
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      const chars = content.length;
      const estDuration = Math.round(words / 2.5); // ~150 words/min = 2.5 words/sec

      const [inserted] = await db!
        .insert(scriptVersions)
        .values({
          episodeId: epId,
          versionNumber: nextVersion,
          status,
          content,
          wordCount: words,
          characterCount: chars,
          estimatedDurationSeconds: estDuration,
          createdBy,
          notes: notes || null,
          createdAt: new Date(),
        })
        .returning();

      // Log event
      await this.logEvent({
        episodeId: epId,
        eventType: "SCRIPT_CREATED",
        actorType: createdBy,
        description: `Script version v${nextVersion} created (${words} words, status: ${status})`,
        metadataJson: { versionNumber: nextVersion, status, wordCount: words },
      });

      // Sync legacy store
      try {
        dbStore.addScriptVersion(episodeIdOrCode, content, status, createdBy, notes);
      } catch {}

      return inserted;
    } catch (err) {
      console.warn("Neon addScriptVersion failed, using store fallback:", err);
      return dbStore.addScriptVersion(episodeIdOrCode, content, status, createdBy, notes) as any;
    }
  }

  // 5. Add asset
  async addAsset(
    episodeIdOrCode: string,
    assetData: {
      assetType: AssetType;
      filename: string;
      blobUrl: string;
      mimeType?: string | null;
      fileSize?: number | null;
      variant?: string | null;
      version?: number;
      isPrimary?: boolean;
      actor?: ActorType;
    }
  ): Promise<typeof assets.$inferSelect> {
    if (!this.isAvailable()) {
      return dbStore.addAsset(episodeIdOrCode, assetData as any) as any;
    }

    try {
      const full = await this.findEpisodeByCodeOrGlobalId(episodeIdOrCode);
      if (!full) throw new Error(`Episode ${episodeIdOrCode} not found`);

      const epId = full.episode.id;

      if (assetData.isPrimary && assetData.assetType === "THUMBNAIL") {
        await db!
          .update(assets)
          .set({ isPrimary: false })
          .where(sql`${assets.episodeId} = ${epId} AND ${assets.assetType} = 'THUMBNAIL'`);
      }

      const [inserted] = await db!
        .insert(assets)
        .values({
          episodeId: epId,
          assetType: assetData.assetType,
          filename: assetData.filename,
          blobUrl: assetData.blobUrl,
          mimeType: assetData.mimeType || null,
          fileSize: assetData.fileSize || 0,
          variant: assetData.variant || null,
          version: assetData.version || 1,
          isPrimary: assetData.isPrimary || false,
          createdAt: new Date(),
        })
        .returning();

      await this.logEvent({
        episodeId: epId,
        eventType: assetData.assetType === "THUMBNAIL" ? "THUMBNAIL_CREATED" : "EPISODE_UPDATED",
        actorType: assetData.actor || "USER",
        description: `Asset ${assetData.filename} (${assetData.assetType}) added`,
        metadataJson: assetData,
      });

      // Sync legacy store
      try {
        dbStore.addAsset(episodeIdOrCode, assetData as any);
      } catch {}

      return inserted;
    } catch (err) {
      console.warn("Neon addAsset failed, using store fallback:", err);
      return dbStore.addAsset(episodeIdOrCode, assetData as any) as any;
    }
  }

  // 6. Log production event
  async logEvent(event: {
    episodeId?: string | null;
    eventType: EventType;
    actorType: ActorType;
    description: string;
    metadataJson?: Record<string, any> | null;
  }): Promise<void> {
    if (!this.isAvailable()) {
      dbStore.addEvent(event.episodeId || null, event.eventType, event.actorType, event.description, event.metadataJson || null);
      return;
    }

    try {
      await db!.insert(productionEvents).values({
        episodeId: event.episodeId || null,
        eventType: event.eventType,
        actorType: event.actorType,
        description: event.description,
        metadataJson: event.metadataJson || null,
        createdAt: new Date(),
      });
    } catch (err) {
      console.warn("Failed to log production event to Neon:", err);
    }
  }

  // 7. Update Episode editorial identity
  async updateEpisode(
    episodeIdOrCode: string,
    updates: Partial<typeof episodes.$inferInsert>,
    actor: ActorType = "USER"
  ): Promise<typeof episodes.$inferSelect> {
    if (!this.isAvailable()) {
      return dbStore.updateEpisode(episodeIdOrCode, updates as any, actor) as any;
    }

    try {
      const full = await this.findEpisodeByCodeOrGlobalId(episodeIdOrCode);
      if (!full) throw new Error(`Episode ${episodeIdOrCode} not found`);

      const epId = full.episode.id;
      const [updated] = await db!
        .update(episodes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, epId))
        .returning();

      await this.logEvent({
        episodeId: epId,
        eventType: "EPISODE_UPDATED",
        actorType: actor,
        description: `Episode ${full.episode.codeSerie} updated by ${actor}`,
        metadataJson: updates,
      });

      try {
        dbStore.updateEpisode(episodeIdOrCode, updates as any, actor);
      } catch {}

      return updated;
    } catch (err) {
      console.warn("Neon updateEpisode failed, using store fallback:", err);
      return dbStore.updateEpisode(episodeIdOrCode, updates as any, actor) as any;
    }
  }

  // 8. Update Episode Metadata
  async updateMetadata(
    episodeIdOrCode: string,
    metadataUpdates: Partial<typeof episodeMetadata.$inferInsert>,
    actor: ActorType = "USER"
  ): Promise<typeof episodeMetadata.$inferSelect> {
    if (!this.isAvailable()) {
      return dbStore.updateMetadata(episodeIdOrCode, metadataUpdates as any, actor) as any;
    }

    try {
      const full = await this.findEpisodeByCodeOrGlobalId(episodeIdOrCode);
      if (!full) throw new Error(`Episode ${episodeIdOrCode} not found`);

      const epId = full.episode.id;
      const now = new Date();

      const existing = await db!
        .select()
        .from(episodeMetadata)
        .where(eq(episodeMetadata.episodeId, epId))
        .limit(1);

      let result: typeof episodeMetadata.$inferSelect;

      if (existing.length === 0) {
        const [inserted] = await db!
          .insert(episodeMetadata)
          .values({
            episodeId: epId,
            titleOption1: metadataUpdates.titleOption1 || null,
            titleOption2: metadataUpdates.titleOption2 || null,
            titleOption3: metadataUpdates.titleOption3 || null,
            selectedTitle: metadataUpdates.selectedTitle || null,
            description: metadataUpdates.description || null,
            chapters: metadataUpdates.chapters || null,
            tags: metadataUpdates.tags || null,
            playlist: metadataUpdates.playlist || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        result = inserted;
      } else {
        const [updated] = await db!
          .update(episodeMetadata)
          .set({
            ...metadataUpdates,
            updatedAt: now,
          })
          .where(eq(episodeMetadata.episodeId, epId))
          .returning();
        result = updated;
      }

      await this.logEvent({
        episodeId: epId,
        eventType: "METADATA_UPDATED",
        actorType: actor,
        description: `Metadata updated for ${full.episode.codeSerie}`,
        metadataJson: metadataUpdates,
      });

      try {
        dbStore.updateMetadata(episodeIdOrCode, metadataUpdates as any, actor);
      } catch {}

      return result;
    } catch (err) {
      console.warn("Neon updateMetadata failed, using store fallback:", err);
      return dbStore.updateMetadata(episodeIdOrCode, metadataUpdates as any, actor) as any;
    }
  }

  // 9. Get events
  async getEvents(episodeIdOrCode?: string | null, limit: number = 20): Promise<(typeof productionEvents.$inferSelect)[]> {
    if (!this.isAvailable()) {
      return dbStore.getEvents(episodeIdOrCode, limit) as any;
    }

    try {
      if (episodeIdOrCode) {
        const full = await this.findEpisodeByCodeOrGlobalId(episodeIdOrCode);
        if (!full) return [];
        return await db!
          .select()
          .from(productionEvents)
          .where(eq(productionEvents.episodeId, full.episode.id))
          .orderBy(desc(productionEvents.createdAt))
          .limit(limit);
      }

      return await db!
        .select()
        .from(productionEvents)
        .orderBy(desc(productionEvents.createdAt))
        .limit(limit);
    } catch (err) {
      console.warn("Neon getEvents failed, fallback to store:", err);
      return dbStore.getEvents(episodeIdOrCode, limit) as any;
    }
  }

  // 10. Get production statistics
  async getProductionStats() {
    const list = await this.getAllEpisodes();
    let total = list.length;
    let notStarted = 0;
    let inProgress = 0;
    let waitingUser = 0;
    let ready = 0;
    let approved = 0;
    let completed = 0;
    let blocked = 0;
    let totalDurationSeconds = 0;

    list.forEach(({ production }) => {
      const s = production.publicationStatus || production.planningStatus;
      if (s === "COMPLETED") completed++;
      else if (s === "IN_PROGRESS") inProgress++;
      else if (s === "WAITING_USER") waitingUser++;
      else if (s === "READY") ready++;
      else if (s === "APPROVED") approved++;
      else if (s === "BLOCKED") blocked++;
      else notStarted++;

      totalDurationSeconds += production.durationSeconds || 0;
    });

    return {
      totalEpisodes: total,
      notStarted,
      inProgress,
      waitingUser,
      ready,
      approved,
      completed,
      blocked,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalDurationSeconds,
    };
  }

  // 11. Deterministic Next Episode to produce
  async getNextEpisodeToProduce(): Promise<CompleteEpisodeRecord | null> {
    const list = await this.getAllEpisodes();

    // 1. Look for episodes currently IN_PROGRESS, WAITING_USER, READY or APPROVED
    const active = list.find((item) => {
      const s = item.production.publicationStatus || item.production.planningStatus;
      return s !== "COMPLETED";
    });

    if (active) {
      return active;
    }

    // 2. Otherwise first NOT_STARTED
    const nextNotStarted = list.find((item) => {
      const s = item.production.publicationStatus || item.production.planningStatus;
      return s === "NOT_STARTED";
    });

    return nextNotStarted || null;
  }
}

export const repository = new PostgresRepository();
