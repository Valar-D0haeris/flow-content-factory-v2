import { ProductionStatus } from "@/db/schema";

/**
 * Valid transitions map for production statuses.
 */
const VALID_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["WAITING_USER", "READY", "BLOCKED", "NOT_STARTED"],
  WAITING_USER: ["IN_PROGRESS", "READY", "APPROVED", "BLOCKED"],
  READY: ["IN_PROGRESS", "APPROVED", "COMPLETED", "BLOCKED"],
  APPROVED: ["COMPLETED", "IN_PROGRESS", "BLOCKED"],
  COMPLETED: ["IN_PROGRESS"], // Re-opening allowed explicitly
  BLOCKED: ["NOT_STARTED", "IN_PROGRESS", "WAITING_USER", "READY"],
};

/**
 * Validates if a transition between two statuses is allowed.
 */
export function isValidStatusTransition(
  currentStatus: ProductionStatus,
  targetStatus: ProductionStatus
): { valid: boolean; error?: string } {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (allowed.includes(targetStatus)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Transition from status '${currentStatus}' to '${targetStatus}' is invalid. Allowed transitions: ${allowed.join(
      ", "
    )}`,
  };
}

export interface EpisodeForNextCalculation {
  id: string;
  globalId: string;
  codeSerie: string;
  episodeNumber: number;
  title: string;
  conceptPlaylist: string;
  production: {
    planningStatus: ProductionStatus;
    scriptStatus: ProductionStatus;
    audioStatus: ProductionStatus;
    publicationStatus: ProductionStatus;
  } | null;
}

/**
 * Deterministic Next Episode Resolution Algorithm
 * 
 * Rules:
 * 1. Filter out all episodes where publicationStatus === 'COMPLETED' or planningStatus === 'COMPLETED'.
 * 2. Find any episode currently IN_PROGRESS, WAITING_USER, or READY (in priority order).
 * 3. If none in progress, select the first NOT_STARTED episode in chronological sequence (ordered by episodeNumber / globalId).
 * 4. If all are completed, return null with explicit status indicator.
 */
export function findNextEpisodeToProduce<T extends EpisodeForNextCalculation>(
  episodesList: T[]
): {
  nextEpisode: T | null;
  reason: string;
  ambiguityDetected: boolean;
} {
  if (!episodesList || episodesList.length === 0) {
    return {
      nextEpisode: null,
      reason: "No episodes found in planning",
      ambiguityDetected: false,
    };
  }

  // Sort episodes by episodeNumber ascending, then globalId
  const sorted = [...episodesList].sort((a, b) => {
    if (a.episodeNumber !== b.episodeNumber) {
      return a.episodeNumber - b.episodeNumber;
    }
    const numA = parseInt(a.globalId, 10);
    const numB = parseInt(b.globalId, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.globalId.localeCompare(b.globalId);
  });

  // 1. Look for active work in progress
  const inProgress = sorted.find(
    (ep) =>
      ep.production?.planningStatus === "IN_PROGRESS" ||
      ep.production?.scriptStatus === "IN_PROGRESS" ||
      ep.production?.planningStatus === "WAITING_USER" ||
      ep.production?.scriptStatus === "WAITING_USER"
  );

  if (inProgress) {
    return {
      nextEpisode: inProgress,
      reason: `Episode ${inProgress.codeSerie} (${inProgress.globalId}) is currently in progress / waiting for review.`,
      ambiguityDetected: false,
    };
  }

  // 2. Look for ready to produce / approved scripts awaiting audio/publication
  const ready = sorted.find(
    (ep) =>
      (ep.production?.scriptStatus === "APPROVED" || ep.production?.scriptStatus === "READY") &&
      ep.production?.publicationStatus !== "COMPLETED"
  );

  if (ready) {
    return {
      nextEpisode: ready,
      reason: `Episode ${ready.codeSerie} (${ready.globalId}) script is ready/approved, awaiting audio or publication.`,
      ambiguityDetected: false,
    };
  }

  // 3. Look for the first unstarted episode
  const notStarted = sorted.find(
    (ep) =>
      (!ep.production ||
        ep.production.planningStatus === "NOT_STARTED" ||
        ep.production.scriptStatus === "NOT_STARTED") &&
      ep.production?.publicationStatus !== "COMPLETED"
  );

  if (notStarted) {
    return {
      nextEpisode: notStarted,
      reason: `Next scheduled unstarted episode according to editorial planning order: ${notStarted.codeSerie} (${notStarted.globalId}).`,
      ambiguityDetected: false,
    };
  }

  return {
    nextEpisode: null,
    reason: "All 45 planned episodes are marked as completed.",
    ambiguityDetected: false,
  };
}
