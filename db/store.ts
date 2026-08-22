import fs from "fs";
import path from "path";
import { generateFull45Episodes } from "./seed-data";
import { ProductionStatus, ScriptStatus, AssetType, ActorType, EventType } from "./schema";

export interface EpisodeEntity {
  id: string;
  globalId: string;
  codeSerie: string;
  episodeNumber: number;
  title: string;
  conceptPlaylist: string;
  thumbnailText: string | null;
  thumbnailVisual: string | null;
  hook: string | null;
  keywords: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionEntity {
  id: string;
  episodeId: string;
  planningStatus: ProductionStatus;
  scriptStatus: ProductionStatus;
  reviewStatus: ProductionStatus;
  audioStatus: ProductionStatus;
  metadataStatus: ProductionStatus;
  thumbnailStatus: ProductionStatus;
  publicationStatus: ProductionStatus;
  durationSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptVersionEntity {
  id: string;
  episodeId: string;
  versionNumber: number;
  status: ScriptStatus;
  content: string;
  storageUrl: string | null;
  wordCount: number;
  characterCount: number;
  estimatedDurationSeconds: number;
  createdBy: string;
  notes: string | null;
  createdAt: string;
}

export interface MetadataEntity {
  id: string;
  episodeId: string;
  titleOption1: string | null;
  titleOption2: string | null;
  titleOption3: string | null;
  selectedTitle: string | null;
  description: string | null;
  chapters: Array<{ timestamp: string; seconds: number; title: string }> | null;
  tags: string[] | null;
  playlist: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetEntity {
  id: string;
  episodeId: string;
  assetType: AssetType;
  filename: string;
  blobUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  variant: string | null;
  version: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductionEventEntity {
  id: string;
  episodeId: string | null;
  eventType: EventType;
  actorType: ActorType;
  description: string;
  metadataJson: Record<string, any> | null;
  createdAt: string;
}

export interface CompleteEpisodeData {
  episode: EpisodeEntity;
  production: ProductionEntity;
  scripts: ScriptVersionEntity[];
  metadata: MetadataEntity | null;
  assets: AssetEntity[];
  events: ProductionEventEntity[];
}

class DataStore {
  private episodes: Map<string, EpisodeEntity> = new Map();
  private production: Map<string, ProductionEntity> = new Map();
  private scripts: Map<string, ScriptVersionEntity[]> = new Map();
  private metadata: Map<string, MetadataEntity> = new Map();
  private assets: Map<string, AssetEntity[]> = new Map();
  private events: ProductionEventEntity[] = [];

  private storageFile = path.resolve(process.cwd(), ".data_store.json");

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, "utf-8");
        const data = JSON.parse(raw);
        if (data.episodes && Array.isArray(data.episodes) && data.episodes.length > 0) {
          data.episodes.forEach((ep: EpisodeEntity) => this.episodes.set(ep.id, ep));
          data.production?.forEach((p: ProductionEntity) => this.production.set(p.episodeId, p));
          data.scripts?.forEach((s: ScriptVersionEntity) => {
            const list = this.scripts.get(s.episodeId) || [];
            list.push(s);
            this.scripts.set(s.episodeId, list);
          });
          data.metadata?.forEach((m: MetadataEntity) => this.metadata.set(m.episodeId, m));
          data.assets?.forEach((a: AssetEntity) => {
            const list = this.assets.get(a.episodeId) || [];
            list.push(a);
            this.assets.set(a.episodeId, list);
          });
          this.events = data.events || [];
          return;
        }
      }
    } catch {
      // Fallback
    }

    this.seedDefaultData();
  }

  public saveToDisk() {
    try {
      const allScripts: ScriptVersionEntity[] = [];
      this.scripts.forEach((list) => allScripts.push(...list));

      const allAssets: AssetEntity[] = [];
      this.assets.forEach((list) => allAssets.push(...list));

      const data = {
        episodes: Array.from(this.episodes.values()),
        production: Array.from(this.production.values()),
        scripts: allScripts,
        metadata: Array.from(this.metadata.values()),
        assets: allAssets,
        events: this.events,
      };

      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.warn("Unable to persist store to disk:", err);
    }
  }

  public seedDefaultData() {
    const raw45 = generateFull45Episodes();
    const now = new Date().toISOString();

    this.episodes.clear();
    this.production.clear();
    this.scripts.clear();
    this.metadata.clear();
    this.assets.clear();
    this.events = [];

    for (let i = 0; i < raw45.length; i++) {
      const row = raw45[i];
      const epId = `ep_${(i + 1).toString().padStart(3, "0")}`;
      const epNumber = i + 1;

      const episode: EpisodeEntity = {
        id: epId,
        globalId: row["ID Global"],
        codeSerie: row["Code Série"],
        episodeNumber: epNumber,
        title: row["Titre de la Vidéo"],
        conceptPlaylist: row["Concept / Playlist"],
        thumbnailText: row["Texte Miniature"] || null,
        thumbnailVisual: row["Visuel Miniature"] || null,
        hook: row["Hook (0-15s)"] || null,
        keywords: row["Mots-Clés (15 tags)"] || null,
        description: row["Description Complète"] || null,
        createdAt: now,
        updatedAt: now,
      };

      this.episodes.set(epId, episode);

      let planStatus: ProductionStatus = "NOT_STARTED";
      let scriptStatus: ProductionStatus = "NOT_STARTED";
      let audioStatus: ProductionStatus = "NOT_STARTED";
      let metaStatus: ProductionStatus = "NOT_STARTED";
      let thumbStatus: ProductionStatus = "NOT_STARTED";
      let pubStatus: ProductionStatus = "NOT_STARTED";
      let durSecs = 0;

      if (i === 0) {
        planStatus = "COMPLETED";
        scriptStatus = "COMPLETED";
        audioStatus = "COMPLETED";
        metaStatus = "COMPLETED";
        thumbStatus = "COMPLETED";
        pubStatus = "COMPLETED";
        durSecs = 1398;
      } else if (i === 1) {
        planStatus = "IN_PROGRESS";
        scriptStatus = "APPROVED";
        audioStatus = "IN_PROGRESS";
        metaStatus = "IN_PROGRESS";
        thumbStatus = "IN_PROGRESS";
        pubStatus = "IN_PROGRESS";
        durSecs = 1145;
      } else if (i === 2) {
        planStatus = "IN_PROGRESS";
        scriptStatus = "IN_PROGRESS";
      }

      const prod: ProductionEntity = {
        id: `prod_${epId}`,
        episodeId: epId,
        planningStatus: planStatus,
        scriptStatus: scriptStatus,
        reviewStatus: scriptStatus === "APPROVED" || scriptStatus === "COMPLETED" ? "APPROVED" : "NOT_STARTED",
        audioStatus: audioStatus,
        metadataStatus: metaStatus,
        thumbnailStatus: thumbStatus,
        publicationStatus: pubStatus,
        durationSeconds: durSecs,
        startedAt: i < 3 ? now : null,
        completedAt: i === 0 ? now : null,
        createdAt: now,
        updatedAt: now,
      };
      this.production.set(epId, prod);

      if (i < 3) {
        const sampleScript = `Speaker 1: Hello and welcome back to Speak English With Flow!
Speaker 2: It's wonderful to be here today for episode ${episode.codeSerie}.
Speaker 1: Today, we are discussing "${episode.title}".
Speaker 2: Exactly. Let's break down practical conversational fluency together!
Speaker 1: Let's begin with our first active listening exercise!`;

        const scriptVer: ScriptVersionEntity = {
          id: `script_${epId}_v1`,
          episodeId: epId,
          versionNumber: 1,
          status: i === 0 ? "FINAL" : i === 1 ? "APPROVED" : "DRAFT",
          content: sampleScript,
          storageUrl: null,
          wordCount: sampleScript.split(/\s+/).length,
          characterCount: sampleScript.length,
          estimatedDurationSeconds: Math.floor(sampleScript.split(/\s+/).length / 2.5),
          createdBy: "GPT",
          notes: "Initial structure with Maya & Leo.",
          createdAt: now,
        };
        this.scripts.set(epId, [scriptVer]);
      } else {
        this.scripts.set(epId, []);
      }

      const meta: MetadataEntity = {
        id: `meta_${epId}`,
        episodeId: epId,
        titleOption1: episode.title,
        titleOption2: `Master ${episode.conceptPlaylist}: ${episode.codeSerie} Deep Dive`,
        titleOption3: `How to Speak Natural English: ${episode.title}`,
        selectedTitle: episode.title,
        description: episode.description,
        chapters: [
          { timestamp: "00:00", seconds: 0, title: "Introduction & Hook" },
          { timestamp: "02:30", seconds: 150, title: "Core Psychological Shift" },
          { timestamp: "08:45", seconds: 525, title: "Interactive Conversation Practice" },
          { timestamp: "18:20", seconds: 1100, title: "Summary & Action Challenge" },
        ],
        tags: (episode.keywords || "").split(",").map((t) => t.trim()).filter(Boolean),
        playlist: episode.conceptPlaylist,
        createdAt: now,
        updatedAt: now,
      };
      this.metadata.set(epId, meta);

      const assetList: AssetEntity[] = [
        {
          id: `asset_${epId}_thumb_a`,
          episodeId: epId,
          assetType: "THUMBNAIL",
          filename: `thumbnail_${episode.codeSerie}_A.png`,
          blobUrl: `/assets/placeholders/thumb_a.png`,
          mimeType: "image/png",
          fileSize: 450000,
          variant: "A",
          version: 1,
          isPrimary: true,
          createdAt: now,
        },
        {
          id: `asset_${epId}_thumb_b`,
          episodeId: epId,
          assetType: "THUMBNAIL",
          filename: `thumbnail_${episode.codeSerie}_B.png`,
          blobUrl: `/assets/placeholders/thumb_b.png`,
          mimeType: "image/png",
          fileSize: 480000,
          variant: "B",
          version: 1,
          isPrimary: false,
          createdAt: now,
        },
        {
          id: `asset_${epId}_thumb_c`,
          episodeId: epId,
          assetType: "THUMBNAIL",
          filename: `thumbnail_${episode.codeSerie}_C.png`,
          blobUrl: `/assets/placeholders/thumb_c.png`,
          mimeType: "image/png",
          fileSize: 465000,
          variant: "C",
          version: 1,
          isPrimary: false,
          createdAt: now,
        },
      ];

      if (durSecs > 0) {
        assetList.push({
          id: `asset_${epId}_audio`,
          episodeId: epId,
          assetType: "AUDIO",
          filename: `audio_${episode.codeSerie}_master.mp3`,
          blobUrl: `/assets/placeholders/audio_master.mp3`,
          mimeType: "audio/mpeg",
          fileSize: 18500000,
          variant: "MASTER",
          version: 1,
          isPrimary: true,
          createdAt: now,
        });
      }

      this.assets.set(epId, assetList);
    }

    this.events.push({
      id: `evt_init`,
      episodeId: null,
      eventType: "CSV_IMPORTED",
      actorType: "SYSTEM",
      description: "Official 45 editorial planning episodes populated into persistent store.",
      metadataJson: { count: 45 },
      createdAt: now,
    });

    this.saveToDisk();
  }

  public getAllEpisodes(): Array<{
    episode: EpisodeEntity;
    production: ProductionEntity;
    scriptsCount: number;
    assetsCount: number;
  }> {
    const list: Array<{
      episode: EpisodeEntity;
      production: ProductionEntity;
      scriptsCount: number;
      assetsCount: number;
    }> = [];

    this.episodes.forEach((ep) => {
      const prod = this.production.get(ep.id) || this.createDefaultProduction(ep.id);
      const scriptCount = (this.scripts.get(ep.id) || []).length;
      const assetCount = (this.assets.get(ep.id) || []).length;
      list.push({
        episode: ep,
        production: prod,
        scriptsCount: scriptCount,
        assetsCount: assetCount,
      });
    });

    return list.sort((a, b) => a.episode.episodeNumber - b.episode.episodeNumber);
  }

  public findEpisodeByCodeOrGlobalId(identifier: string): CompleteEpisodeData | null {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanNoHash = clean.replace("#", "");

    let foundEp: EpisodeEntity | undefined;
    for (const ep of this.episodes.values()) {
      const gClean = ep.globalId.toLowerCase();
      const gNoHash = gClean.replace("#", "");

      if (
        ep.codeSerie.toLowerCase() === clean ||
        gClean === clean ||
        gNoHash === cleanNoHash ||
        ep.id.toLowerCase() === clean ||
        `ep${ep.episodeNumber}`.toLowerCase() === cleanNoHash ||
        `ep#${ep.episodeNumber}`.toLowerCase() === clean
      ) {
        foundEp = ep;
        break;
      }
    }

    if (!foundEp) return null;

    const prod = this.production.get(foundEp.id) || this.createDefaultProduction(foundEp.id);
    const scripts = this.scripts.get(foundEp.id) || [];
    const metadata = this.metadata.get(foundEp.id) || null;
    const assets = this.assets.get(foundEp.id) || [];
    const events = this.events.filter((e) => e.episodeId === foundEp!.id);

    return {
      episode: foundEp,
      production: prod,
      scripts,
      metadata,
      assets,
      events,
    };
  }

  public updateEpisode(
    id: string,
    updates: Partial<EpisodeEntity>,
    actor: ActorType = "USER"
  ): EpisodeEntity {
    const ep = this.episodes.get(id);
    if (!ep) throw new Error(`Episode ${id} not found`);

    const now = new Date().toISOString();
    const updated: EpisodeEntity = {
      ...ep,
      ...updates,
      updatedAt: now,
    };

    this.episodes.set(id, updated);
    this.addEvent(id, "EPISODE_UPDATED", actor, `Episode ${ep.codeSerie} updated`, { updates });
    this.saveToDisk();
    return updated;
  }

  public updateProduction(
    episodeId: string,
    updates: Partial<ProductionEntity>,
    actor: ActorType = "USER"
  ): ProductionEntity {
    const ep = this.episodes.get(episodeId);
    if (!ep) throw new Error(`Episode ${episodeId} not found`);

    const current = this.production.get(episodeId) || this.createDefaultProduction(episodeId);
    const now = new Date().toISOString();

    const updated: ProductionEntity = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    if (updates.planningStatus === "COMPLETED" || updates.publicationStatus === "COMPLETED") {
      updated.completedAt = now;
    }

    this.production.set(episodeId, updated);
    this.addEvent(episodeId, "STATUS_CHANGED", actor, `Production state changed for ${ep.codeSerie}`, { updates });
    this.saveToDisk();
    return updated;
  }

  public addScriptVersion(
    episodeId: string,
    content: string,
    status: ScriptStatus = "DRAFT",
    createdBy: string = "USER",
    notes: string | null = null
  ): ScriptVersionEntity {
    const ep = this.episodes.get(episodeId);
    if (!ep) throw new Error(`Episode ${episodeId} not found`);

    const list = this.scripts.get(episodeId) || [];
    const nextVerNumber = list.length + 1;
    const now = new Date().toISOString();

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const characterCount = content.length;
    const estimatedDurationSeconds = Math.round(wordCount / 2.5);

    const script: ScriptVersionEntity = {
      id: `script_${episodeId}_v${nextVerNumber}`,
      episodeId,
      versionNumber: nextVerNumber,
      status,
      content,
      storageUrl: null,
      wordCount,
      characterCount,
      estimatedDurationSeconds,
      createdBy,
      notes,
      createdAt: now,
    };

    list.push(script);
    this.scripts.set(episodeId, list);

    const currentProd = this.production.get(episodeId);
    if (currentProd) {
      currentProd.scriptStatus = status === "FINAL" ? "COMPLETED" : status === "APPROVED" ? "APPROVED" : "IN_PROGRESS";
      currentProd.updatedAt = now;
      this.production.set(episodeId, currentProd);
    }

    this.addEvent(
      episodeId,
      "SCRIPT_CREATED",
      createdBy.toUpperCase() === "GPT" ? "GPT" : "USER",
      `New script version v${nextVerNumber} created (${status})`,
      { versionNumber: nextVerNumber, wordCount, status }
    );

    this.saveToDisk();
    return script;
  }

  public updateMetadata(
    episodeId: string,
    updates: Partial<MetadataEntity>,
    actor: ActorType = "USER"
  ): MetadataEntity {
    const ep = this.episodes.get(episodeId);
    if (!ep) throw new Error(`Episode ${episodeId} not found`);

    const current = this.metadata.get(episodeId) || {
      id: `meta_${episodeId}`,
      episodeId,
      titleOption1: null,
      titleOption2: null,
      titleOption3: null,
      selectedTitle: ep.title,
      description: ep.description,
      chapters: null,
      tags: null,
      playlist: ep.conceptPlaylist,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    const updated: MetadataEntity = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    this.metadata.set(episodeId, updated);
    this.addEvent(episodeId, "METADATA_UPDATED", actor, `Metadata updated for ${ep.codeSerie}`, { updates });
    this.saveToDisk();
    return updated;
  }

  public addAsset(
    episodeId: string,
    assetData: Omit<AssetEntity, "id" | "createdAt">,
    actor: ActorType = "USER"
  ): AssetEntity {
    const ep = this.episodes.get(episodeId);
    if (!ep) throw new Error(`Episode ${episodeId} not found`);

    const list = this.assets.get(episodeId) || [];
    const now = new Date().toISOString();

    if (assetData.isPrimary) {
      list.forEach((a) => {
        if (a.assetType === assetData.assetType) {
          a.isPrimary = false;
        }
      });
    }

    const asset: AssetEntity = {
      ...assetData,
      id: `asset_${episodeId}_${Date.now()}`,
      createdAt: now,
    };

    list.push(asset);
    this.assets.set(episodeId, list);

    this.addEvent(
      episodeId,
      assetData.assetType === "THUMBNAIL" ? "THUMBNAIL_CREATED" : "AUDIO_DURATION_UPDATED",
      actor,
      `Asset added: ${assetData.filename} (${assetData.assetType}${assetData.variant ? " " + assetData.variant : ""})`,
      { assetType: assetData.assetType, filename: assetData.filename }
    );

    this.saveToDisk();
    return asset;
  }

  public setPrimaryThumbnail(episodeId: string, assetId: string, actor: ActorType = "USER"): void {
    const list = this.assets.get(episodeId) || [];
    let updated = false;

    list.forEach((a) => {
      if (a.assetType === "THUMBNAIL") {
        if (a.id === assetId) {
          a.isPrimary = true;
          updated = true;
        } else {
          a.isPrimary = false;
        }
      }
    });

    if (updated) {
      this.addEvent(episodeId, "THUMBNAIL_UPDATED", actor, `Primary thumbnail set to asset ${assetId}`, { assetId });
      this.saveToDisk();
    }
  }

  public extendPlanning(
    newEpisodes: Array<Partial<EpisodeEntity>>,
    actor: ActorType = "GPT"
  ): EpisodeEntity[] {
    const now = new Date().toISOString();
    const createdList: EpisodeEntity[] = [];

    const existingList = Array.from(this.episodes.values());
    let maxEpNum = existingList.reduce((max, ep) => (ep.episodeNumber > max ? ep.episodeNumber : max), 0);

    for (const item of newEpisodes) {
      maxEpNum++;
      const globalId = item.globalId || `EP#${maxEpNum.toString().padStart(2, "0")}`;
      const epId = `ep_${maxEpNum.toString().padStart(3, "0")}`;

      const ep: EpisodeEntity = {
        id: epId,
        globalId,
        codeSerie: item.codeSerie || `EXT_${maxEpNum}`,
        episodeNumber: maxEpNum,
        title: item.title || "Untitled Episode",
        conceptPlaylist: item.conceptPlaylist || "General",
        thumbnailText: item.thumbnailText || null,
        thumbnailVisual: item.thumbnailVisual || null,
        hook: item.hook || null,
        keywords: item.keywords || null,
        description: item.description || null,
        createdAt: now,
        updatedAt: now,
      };

      this.episodes.set(epId, ep);
      this.production.set(epId, this.createDefaultProduction(epId));
      this.scripts.set(epId, []);
      this.metadata.set(epId, {
        id: `meta_${epId}`,
        episodeId: epId,
        titleOption1: ep.title,
        titleOption2: null,
        titleOption3: null,
        selectedTitle: ep.title,
        description: ep.description,
        chapters: null,
        tags: null,
        playlist: ep.conceptPlaylist,
        createdAt: now,
        updatedAt: now,
      });
      this.assets.set(epId, []);

      createdList.push(ep);
    }

    this.addEvent(
      null,
      "PLANNING_EXTENDED",
      actor,
      `Planning extended with ${createdList.length} new episodes`,
      { count: createdList.length, codes: createdList.map((e) => e.codeSerie) }
    );

    this.saveToDisk();
    return createdList;
  }

  public importCsvConfirmed(
    itemsToCreate: Array<Partial<EpisodeEntity>>,
    itemsToUpdate: Array<{ id: string; updates: Partial<EpisodeEntity> }>,
    actor: ActorType = "USER"
  ): { created: number; updated: number } {
    const now = new Date().toISOString();
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of itemsToUpdate) {
      const ep = this.episodes.get(item.id);
      if (ep) {
        const updated: EpisodeEntity = {
          ...ep,
          ...item.updates,
          updatedAt: now,
        };
        this.episodes.set(item.id, updated);
        updatedCount++;
      }
    }

    const existingList = Array.from(this.episodes.values());
    let maxEpNum = existingList.reduce((max, ep) => (ep.episodeNumber > max ? ep.episodeNumber : max), 0);

    for (const item of itemsToCreate) {
      maxEpNum++;
      const epId = `ep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const ep: EpisodeEntity = {
        id: epId,
        globalId: item.globalId || `EP#${maxEpNum.toString().padStart(2, "0")}`,
        codeSerie: item.codeSerie || `EP_${maxEpNum}`,
        episodeNumber: maxEpNum,
        title: item.title || "Untitled",
        conceptPlaylist: item.conceptPlaylist || "General",
        thumbnailText: item.thumbnailText || null,
        thumbnailVisual: item.thumbnailVisual || null,
        hook: item.hook || null,
        keywords: item.keywords || null,
        description: item.description || null,
        createdAt: now,
        updatedAt: now,
      };

      this.episodes.set(epId, ep);
      this.production.set(epId, this.createDefaultProduction(epId));
      this.scripts.set(epId, []);
      this.metadata.set(epId, {
        id: `meta_${epId}`,
        episodeId: epId,
        titleOption1: ep.title,
        titleOption2: null,
        titleOption3: null,
        selectedTitle: ep.title,
        description: ep.description,
        chapters: null,
        tags: null,
        playlist: ep.conceptPlaylist,
        createdAt: now,
        updatedAt: now,
      });
      this.assets.set(epId, []);
      createdCount++;
    }

    this.addEvent(
      null,
      "CSV_IMPORTED",
      actor,
      `CSV import confirmed: ${createdCount} created, ${updatedCount} updated`,
      { created: createdCount, updated: updatedCount }
    );

    this.saveToDisk();
    return { created: createdCount, updated: updatedCount };
  }

  public getEvents(episodeId?: string | null, limit: number = 50): ProductionEventEntity[] {
    const list = episodeId
      ? this.events.filter((e) => e.episodeId === episodeId)
      : this.events;
    return list.slice(-limit).reverse();
  }

  public addEvent(
    episodeId: string | null,
    eventType: EventType,
    actorType: ActorType,
    description: string,
    metadataJson: Record<string, any> | null = null
  ): ProductionEventEntity {
    const evt: ProductionEventEntity = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      episodeId,
      eventType,
      actorType,
      description,
      metadataJson,
      createdAt: new Date().toISOString(),
    };
    this.events.push(evt);
    return evt;
  }

  private createDefaultProduction(episodeId: string): ProductionEntity {
    const now = new Date().toISOString();
    return {
      id: `prod_${episodeId}`,
      episodeId,
      planningStatus: "NOT_STARTED",
      scriptStatus: "NOT_STARTED",
      reviewStatus: "NOT_STARTED",
      audioStatus: "NOT_STARTED",
      metadataStatus: "NOT_STARTED",
      thumbnailStatus: "NOT_STARTED",
      publicationStatus: "NOT_STARTED",
      durationSeconds: 0,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}

declare global {
  var __FLOW_STORE__: DataStore | undefined;
}

export const dbStore = globalThis.__FLOW_STORE__ || new DataStore();
if (process.env.NODE_ENV !== "production") {
  globalThis.__FLOW_STORE__ = dbStore;
}
