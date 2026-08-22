import { pgTable, text, varchar, integer, timestamp, boolean, uuid, json, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums as constants
export const PRODUCTION_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_USER",
  "READY",
  "APPROVED",
  "COMPLETED",
  "BLOCKED",
] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const SCRIPT_STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "FINAL",
  "ARCHIVED",
] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

export const ASSET_TYPES = [
  "SCRIPT",
  "AUDIO",
  "THUMBNAIL",
  "IMAGE",
  "VIDEO",
  "SUBTITLE",
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ACTOR_TYPES = ["USER", "GPT", "SYSTEM", "DASHBOARD"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const EVENT_TYPES = [
  "SCRIPT_CREATED",
  "SCRIPT_UPDATED",
  "SCRIPT_APPROVED",
  "AUDIO_DURATION_UPDATED",
  "METADATA_CREATED",
  "METADATA_UPDATED",
  "THUMBNAIL_CREATED",
  "THUMBNAIL_UPDATED",
  "STATUS_CHANGED",
  "CSV_IMPORTED",
  "CSV_EXPORTED",
  "PLANNING_EXTENDED",
  "EPISODE_CREATED",
  "EPISODE_UPDATED",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// 1. Table: episodes (Canonical Editorial Identity)
export const episodes = pgTable(
  "episodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    globalId: varchar("global_id", { length: 64 }).notNull().unique(),
    codeSerie: varchar("code_serie", { length: 64 }).notNull(),
    episodeNumber: integer("episode_number").notNull().default(0),
    title: text("title").notNull(),
    conceptPlaylist: varchar("concept_playlist", { length: 255 }).notNull(),
    thumbnailText: text("thumbnail_text"),
    thumbnailVisual: text("thumbnail_visual"),
    hook: text("hook"),
    keywords: text("keywords"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_episodes_code_serie").on(table.codeSerie),
    index("idx_episodes_episode_number").on(table.episodeNumber),
    index("idx_episodes_concept_playlist").on(table.conceptPlaylist),
    index("idx_episodes_global_id").on(table.globalId),
  ]
);

// 2. Table: episode_production (Live Production State)
export const episodeProduction = pgTable(
  "episode_production",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    planningStatus: varchar("planning_status", { length: 32 }).notNull().default("NOT_STARTED"),
    scriptStatus: varchar("script_status", { length: 32 }).notNull().default("NOT_STARTED"),
    reviewStatus: varchar("review_status", { length: 32 }).notNull().default("NOT_STARTED"),
    audioStatus: varchar("audio_status", { length: 32 }).notNull().default("NOT_STARTED"),
    metadataStatus: varchar("metadata_status", { length: 32 }).notNull().default("NOT_STARTED"),
    thumbnailStatus: varchar("thumbnail_status", { length: 32 }).notNull().default("NOT_STARTED"),
    publicationStatus: varchar("publication_status", { length: 32 }).notNull().default("NOT_STARTED"),
    durationSeconds: integer("duration_seconds").default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_episode_prod_episode_id").on(table.episodeId),
    index("idx_episode_prod_planning_status").on(table.planningStatus),
    index("idx_episode_prod_script_status").on(table.scriptStatus),
    index("idx_episode_prod_publication_status").on(table.publicationStatus),
  ]
);

// 3. Table: script_versions (Immutable Version History)
export const scriptVersions = pgTable(
  "script_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull().default(1),
    status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
    content: text("content").notNull(),
    storageUrl: text("storage_url"),
    wordCount: integer("word_count").notNull().default(0),
    characterCount: integer("character_count").notNull().default(0),
    estimatedDurationSeconds: integer("estimated_duration_seconds").notNull().default(0),
    createdBy: varchar("created_by", { length: 64 }).notNull().default("USER"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_script_ver_episode_id").on(table.episodeId),
    index("idx_script_ver_version_num").on(table.versionNumber),
  ]
);

// 4. Table: episode_metadata (3 Title Proposals & Packaging)
export const episodeMetadata = pgTable(
  "episode_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    titleOption1: text("title_option_1"),
    titleOption2: text("title_option_2"),
    titleOption3: text("title_option_3"),
    selectedTitle: text("selected_title"),
    description: text("description"),
    chapters: json("chapters").$type<Array<{ timestamp: string; seconds: number; title: string }>>(),
    tags: json("tags").$type<string[]>(),
    playlist: varchar("playlist", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_episode_meta_episode_id").on(table.episodeId),
  ]
);

// 5. Table: assets (Audio, Thumbnails A/B/C, Subtitles)
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    episodeId: uuid("episode_id")
      .notNull()
      .references(() => episodes.id, { onDelete: "cascade" }),
    assetType: varchar("asset_type", { length: 32 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    blobUrl: text("blob_url").notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    fileSize: integer("file_size").default(0),
    variant: varchar("variant", { length: 32 }), // "A", "B", "C", etc.
    version: integer("version").default(1),
    isPrimary: boolean("is_primary").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_assets_episode_id").on(table.episodeId),
    index("idx_assets_asset_type").on(table.assetType),
  ]
);

// 6. Table: production_events (Complete Audit Timeline)
export const productionEvents = pgTable(
  "production_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    episodeId: uuid("episode_id").references(() => episodes.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    actorType: varchar("actor_type", { length: 32 }).notNull().default("SYSTEM"),
    description: text("description").notNull(),
    metadataJson: json("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_events_episode_id").on(table.episodeId),
    index("idx_events_created_at").on(table.createdAt),
    index("idx_events_event_type").on(table.eventType),
  ]
);

// Relations
export const episodesRelations = relations(episodes, ({ one, many }) => ({
  production: one(episodeProduction, {
    fields: [episodes.id],
    references: [episodeProduction.episodeId],
  }),
  scripts: many(scriptVersions),
  metadata: one(episodeMetadata, {
    fields: [episodes.id],
    references: [episodeMetadata.episodeId],
  }),
  assets: many(assets),
  events: many(productionEvents),
}));

export const episodeProductionRelations = relations(episodeProduction, ({ one }) => ({
  episode: one(episodes, {
    fields: [episodeProduction.episodeId],
    references: [episodes.id],
  }),
}));

export const scriptVersionsRelations = relations(scriptVersions, ({ one }) => ({
  episode: one(episodes, {
    fields: [scriptVersions.episodeId],
    references: [episodes.id],
  }),
}));

export const episodeMetadataRelations = relations(episodeMetadata, ({ one }) => ({
  episode: one(episodes, {
    fields: [episodeMetadata.episodeId],
    references: [episodes.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  episode: one(episodes, {
    fields: [assets.episodeId],
    references: [episodes.id],
  }),
}));

export const productionEventsRelations = relations(productionEvents, ({ one }) => ({
  episode: one(episodes, {
    fields: [productionEvents.episodeId],
    references: [episodes.id],
  }),
}));
