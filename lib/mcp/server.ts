import { repository } from "@/db/repository";
import { withTimeout } from "@/lib/agent-gateway/service";
import { formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";
import { z } from "zod";

export const MCP_PROTOCOL_VERSION = "2024-11-05";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "get_episodes_status",
    description: "Returns the real-time production status and stages of all 45 episodes from Flow Content Factory persistent memory.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_episode_status",
    description: "Returns the production status, current stage, duration, and deliverable counts for a specific episode code or global ID (e.g. 'EP#01', 'EP06', 'MIND-01').",
    inputSchema: {
      type: "object",
      properties: {
        episodeCode: {
          type: "string",
          description: "Episode code or identifier (e.g. 'EP#01', 'EP06', 'MIND-01', 'B1-B2_01')",
        },
      },
      required: ["episodeCode"],
    },
  },
  {
    name: "get_next_production",
    description: "Deterministically returns the next episode to produce with its full editorial memory, current production stage, and recommended next step.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_episode_context",
    description: "Returns the complete editorial context, concept, hook, thumbnail brief, keywords, script versions, metadata, and assets for an episode.",
    inputSchema: {
      type: "object",
      properties: {
        episodeCode: {
          type: "string",
          description: "Episode code or identifier (e.g. 'MIND-01', 'EP#03', 'EP06')",
        },
      },
      required: ["episodeCode"],
    },
  },
];

const EpisodeCodeSchema = z.object({
  episodeCode: z.string().min(1, "episodeCode is required"),
});

export async function executeMcpTool(name: string, args: any = {}): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "get_episodes_status": {
        const all = await withTimeout(repository.getAllEpisodes(), 8000, "MCP: get_episodes_status");
        const episodes = all.map(({ episode, production }) => ({
          code: episode.codeSerie,
          globalId: episode.globalId,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          playlist: episode.conceptPlaylist,
          status: production.publicationStatus || production.planningStatus || "NOT_STARTED",
          stages: {
            planning: production.planningStatus,
            script: production.scriptStatus,
            review: production.reviewStatus,
            audio: production.audioStatus,
            metadata: production.metadataStatus,
            thumbnail: production.thumbnailStatus,
            publication: production.publicationStatus,
          },
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                episodes,
                total: episodes.length,
                source: "neon_postgresql",
              }, null, 2),
            },
          ],
        };
      }

      case "get_episode_status": {
        const parsed = EpisodeCodeSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `INVALID_ARGUMENTS: ${parsed.error.message}` }],
            isError: true,
          };
        }

        const data = await withTimeout(
          repository.findEpisodeByCodeOrGlobalId(parsed.data.episodeCode),
          8000,
          `MCP: get_episode_status (${parsed.data.episodeCode})`
        );

        if (!data) {
          return {
            content: [{ type: "text", text: `INVALID_EPISODE: Episode '${parsed.data.episodeCode}' not found.` }],
            isError: true,
          };
        }

        const ep = data.episode;
        const prod = data.production;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                code: ep.codeSerie,
                globalId: ep.globalId,
                episodeNumber: ep.episodeNumber,
                title: ep.title,
                status: prod.publicationStatus || prod.planningStatus || "NOT_STARTED",
                stages: {
                  planning: prod.planningStatus,
                  script: prod.scriptStatus,
                  review: prod.reviewStatus,
                  audio: prod.audioStatus,
                  metadata: prod.metadataStatus,
                  thumbnail: prod.thumbnailStatus,
                  publication: prod.publicationStatus,
                },
                durationSeconds: prod.durationSeconds || 0,
                formattedDuration: formatSecondsToTime(prod.durationSeconds || 0),
                scriptsCount: data.scriptsCount,
                assetsCount: data.assetsCount,
                source: "neon_postgresql",
              }, null, 2),
            },
          ],
        };
      }

      case "get_next_production": {
        const nextItem = await withTimeout(repository.getNextEpisodeToProduce(), 8000, "MCP: get_next_production");
        if (!nextItem) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  message: "All planned episodes are currently completed.",
                  episode: null,
                  source: "neon_postgresql",
                }, null, 2),
              },
            ],
          };
        }

        const ep = nextItem.episode;
        const prod = nextItem.production;
        const scriptsList = nextItem.scripts || [];
        const latestScript = scriptsList.length > 0 ? scriptsList[scriptsList.length - 1] : null;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                episode: {
                  id: ep.id,
                  globalId: ep.globalId,
                  slug: ep.codeSerie,
                  episodeNumber: ep.episodeNumber,
                  title: ep.title,
                  playlist: ep.conceptPlaylist,
                  hook: ep.hook,
                  status: prod.publicationStatus || prod.planningStatus || "NOT_STARTED",
                  stages: {
                    planning: prod.planningStatus,
                    script: prod.scriptStatus,
                    review: prod.reviewStatus,
                    audio: prod.audioStatus,
                    metadata: prod.metadataStatus,
                    thumbnail: prod.thumbnailStatus,
                    publication: prod.publicationStatus,
                  },
                  durationSeconds: prod.durationSeconds || 0,
                  formattedDuration: formatSecondsToTime(prod.durationSeconds || 0),
                  humanDuration: formatSecondsToHuman(prod.durationSeconds || 0),
                },
                script: latestScript
                  ? {
                      versionNumber: latestScript.versionNumber,
                      status: latestScript.status,
                      wordCount: latestScript.wordCount,
                      estimatedDurationSeconds: latestScript.estimatedDurationSeconds,
                      content: latestScript.content,
                    }
                  : null,
                recommendation: {
                  nextStep:
                    prod.planningStatus === "NOT_STARTED"
                      ? "START_PLANNING_AND_SCRIPT"
                      : prod.scriptStatus === "NOT_STARTED" || prod.scriptStatus === "DRAFT"
                      ? "GENERATE_OR_REFINE_SCRIPT"
                      : prod.audioStatus === "NOT_STARTED"
                      ? "RECORD_OR_GENERATE_AUDIO"
                      : prod.metadataStatus === "NOT_STARTED"
                      ? "PROPOSE_TITLES_AND_METADATA"
                      : prod.thumbnailStatus === "NOT_STARTED"
                      ? "GENERATE_THUMBNAIL_VARIANTS"
                      : "READY_FOR_FINAL_PUBLICATION",
                },
                source: "neon_postgresql",
              }, null, 2),
            },
          ],
        };
      }

      case "get_episode_context": {
        const parsed = EpisodeCodeSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `INVALID_ARGUMENTS: ${parsed.error.message}` }],
            isError: true,
          };
        }

        const data = await withTimeout(
          repository.findEpisodeByCodeOrGlobalId(parsed.data.episodeCode),
          8000,
          `MCP: get_episode_context (${parsed.data.episodeCode})`
        );

        if (!data) {
          return {
            content: [{ type: "text", text: `INVALID_EPISODE: Episode '${parsed.data.episodeCode}' not found.` }],
            isError: true,
          };
        }

        const ep = data.episode;
        const prod = data.production;
        const latestScript = data.scripts[data.scripts.length - 1] || null;
        const primaryThumb = data.assets.find((a) => a.assetType === "THUMBNAIL" && a.isPrimary);
        const audioAsset = data.assets.find((a) => a.assetType === "AUDIO");

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                identity: {
                  id: ep.id,
                  globalId: ep.globalId,
                  codeSerie: ep.codeSerie,
                  episodeNumber: ep.episodeNumber,
                  title: ep.title,
                  conceptPlaylist: ep.conceptPlaylist,
                },
                editorial: {
                  hook: ep.hook,
                  thumbnailBrief: {
                    text: ep.thumbnailText,
                    visual: ep.thumbnailVisual,
                  },
                  keywordsList: ep.keywords ? ep.keywords.split(",").map((k) => k.trim()) : [],
                  description: ep.description,
                },
                productionState: {
                  planningStatus: prod.planningStatus,
                  scriptStatus: prod.scriptStatus,
                  reviewStatus: prod.reviewStatus,
                  audioStatus: prod.audioStatus,
                  metadataStatus: prod.metadataStatus,
                  thumbnailStatus: prod.thumbnailStatus,
                  publicationStatus: prod.publicationStatus,
                  durationSeconds: prod.durationSeconds || 0,
                  formattedDuration: formatSecondsToTime(prod.durationSeconds || 0),
                  humanDuration: formatSecondsToHuman(prod.durationSeconds || 0),
                },
                script: latestScript
                  ? {
                      versionNumber: latestScript.versionNumber,
                      status: latestScript.status,
                      wordCount: latestScript.wordCount,
                      estimatedDurationSeconds: latestScript.estimatedDurationSeconds,
                      content: latestScript.content,
                    }
                  : null,
                metadata: data.metadata
                  ? {
                      titleOptions: [
                        data.metadata.titleOption1,
                        data.metadata.titleOption2,
                        data.metadata.titleOption3,
                      ].filter(Boolean),
                      selectedTitle: data.metadata.selectedTitle,
                      description: data.metadata.description,
                      chapters: data.metadata.chapters,
                      tags: data.metadata.tags,
                    }
                  : null,
                assetsSummary: {
                  totalAssets: data.assets.length,
                  primaryThumbnailUrl: primaryThumb?.blobUrl || null,
                  audioUrl: audioAsset?.blobUrl || null,
                  thumbnails: data.assets
                    .filter((a) => a.assetType === "THUMBNAIL")
                    .map((t) => ({
                      variant: t.variant,
                      filename: t.filename,
                      url: t.blobUrl,
                      isPrimary: t.isPrimary,
                    })),
                },
                source: "neon_postgresql",
              }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `UNKNOWN_TOOL: Tool '${name}' is not supported.` }],
          isError: true,
        };
    }
  } catch (err: any) {
    const msg = err?.message || "Internal Tool Execution Error";
    return {
      content: [
        {
          type: "text",
          text: `ERROR: ${msg.replace(/postgresql:\/\/[^@]+@/g, "postgresql://***:***@")}`,
        },
      ],
      isError: true,
    };
  }
}
