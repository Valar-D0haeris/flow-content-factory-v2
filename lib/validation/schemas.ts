import { z } from "zod";
import { PRODUCTION_STATUSES, SCRIPT_STATUSES, ASSET_TYPES, ACTOR_TYPES } from "@/db/schema";

// Canonical CSV 9 columns
export const CsvRowSchema = z.object({
  "ID Global": z.string().min(1, "ID Global is required"),
  "Code Série": z.string().min(1, "Code Série is required"),
  "Titre de la Vidéo": z.string().min(1, "Titre de la Vidéo is required"),
  "Concept / Playlist": z.string().min(1, "Concept / Playlist is required"),
  "Texte Miniature": z.string().optional().default(""),
  "Visuel Miniature": z.string().optional().default(""),
  "Hook (0-15s)": z.string().optional().default(""),
  "Mots-Clés (15 tags)": z.string().optional().default(""),
  "Description Complète": z.string().optional().default(""),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

// Episode update payload
export const EpisodeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  conceptPlaylist: z.string().min(1).optional(),
  thumbnailText: z.string().optional().nullable(),
  thumbnailVisual: z.string().optional().nullable(),
  hook: z.string().optional().nullable(),
  keywords: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  expectedUpdatedAt: z.string().optional(), // Optimistic locking
});

// Production status update payload
export const ProductionUpdateSchema = z.object({
  planningStatus: z.enum(PRODUCTION_STATUSES).optional(),
  scriptStatus: z.enum(PRODUCTION_STATUSES).optional(),
  reviewStatus: z.enum(PRODUCTION_STATUSES).optional(),
  audioStatus: z.enum(PRODUCTION_STATUSES).optional(),
  metadataStatus: z.enum(PRODUCTION_STATUSES).optional(),
  thumbnailStatus: z.enum(PRODUCTION_STATUSES).optional(),
  publicationStatus: z.enum(PRODUCTION_STATUSES).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  durationInput: z.string().optional(), // e.g. "23:18" or "23 min 18 s"
  actor: z.enum(ACTOR_TYPES).optional().default("USER"),
});

// Script version creation payload
export const ScriptCreateSchema = z.object({
  content: z.string().min(1, "Script content cannot be empty"),
  versionNumber: z.number().int().positive().optional(),
  status: z.enum(SCRIPT_STATUSES).optional().default("DRAFT"),
  storageUrl: z.string().url().optional().nullable(),
  createdBy: z.enum(ACTOR_TYPES).optional().default("USER"),
  notes: z.string().optional().nullable(),
});

// Metadata creation / update payload
export const MetadataUpdateSchema = z.object({
  titleOption1: z.string().optional().nullable(),
  titleOption2: z.string().optional().nullable(),
  titleOption3: z.string().optional().nullable(),
  selectedTitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  chapters: z
    .array(
      z.object({
        timestamp: z.string(),
        seconds: z.number(),
        title: z.string(),
      })
    )
    .optional()
    .nullable(),
  tags: z.array(z.string()).optional().nullable(),
  playlist: z.string().optional().nullable(),
  actor: z.enum(ACTOR_TYPES).optional().default("USER"),
});

// Asset creation payload
export const AssetCreateSchema = z.object({
  assetType: z.enum(ASSET_TYPES),
  filename: z.string().min(1),
  blobUrl: z.string().min(1),
  mimeType: z.string().optional().nullable(),
  fileSize: z.number().int().optional().nullable(),
  variant: z.string().optional().nullable(), // "A", "B", "C"
  version: z.number().int().positive().optional().default(1),
  isPrimary: z.boolean().optional().default(false),
  actor: z.enum(ACTOR_TYPES).optional().default("USER"),
});

// Planning extend payload
export const PlanningExtendSchema = z.object({
  episodes: z.array(
    z.object({
      globalId: z.string().optional(),
      codeSerie: z.string().min(1, "codeSerie is required"),
      title: z.string().min(1, "title is required"),
      conceptPlaylist: z.string().min(1, "conceptPlaylist is required"),
      thumbnailText: z.string().optional(),
      thumbnailVisual: z.string().optional(),
      hook: z.string().optional(),
      keywords: z.string().optional(),
      description: z.string().optional(),
    })
  ).min(1, "At least one episode must be provided"),
  actor: z.enum(ACTOR_TYPES).optional().default("GPT"),
  confirm: z.boolean().optional().default(true),
});

// Standard API responses
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};
