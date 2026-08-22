import { describe, it, expect } from "vitest";
import { findNextEpisodeToProduce } from "@/lib/production/status";
import { isValidStatusTransition } from "@/lib/production/status";

describe("Production Next Episode Resolution & State Machine", () => {
  it("prioritizes active in-progress episodes over unstarted ones", () => {
    const list = [
      {
        id: "1",
        globalId: "1",
        codeSerie: "B1-B2_01",
        episodeNumber: 1,
        title: "Episode 1",
        conceptPlaylist: "Playlist 1",
        production: {
          planningStatus: "COMPLETED" as const,
          scriptStatus: "COMPLETED" as const,
          audioStatus: "COMPLETED" as const,
          publicationStatus: "COMPLETED" as const,
        },
      },
      {
        id: "2",
        globalId: "2",
        codeSerie: "B1-B2_02",
        episodeNumber: 2,
        title: "Episode 2",
        conceptPlaylist: "Playlist 1",
        production: {
          planningStatus: "IN_PROGRESS" as const,
          scriptStatus: "IN_PROGRESS" as const,
          audioStatus: "NOT_STARTED" as const,
          publicationStatus: "NOT_STARTED" as const,
        },
      },
      {
        id: "3",
        globalId: "3",
        codeSerie: "B1-B2_03",
        episodeNumber: 3,
        title: "Episode 3",
        conceptPlaylist: "Playlist 1",
        production: {
          planningStatus: "NOT_STARTED" as const,
          scriptStatus: "NOT_STARTED" as const,
          audioStatus: "NOT_STARTED" as const,
          publicationStatus: "NOT_STARTED" as const,
        },
      },
    ];

    const result = findNextEpisodeToProduce(list);
    expect(result.nextEpisode?.codeSerie).toBe("B1-B2_02");
    expect(result.reason).toContain("in progress");
  });

  it("selects the first unstarted episode in sequence if none is active", () => {
    const list = [
      {
        id: "1",
        globalId: "1",
        codeSerie: "B1-B2_01",
        episodeNumber: 1,
        title: "Episode 1",
        conceptPlaylist: "Playlist 1",
        production: {
          planningStatus: "COMPLETED" as const,
          scriptStatus: "COMPLETED" as const,
          audioStatus: "COMPLETED" as const,
          publicationStatus: "COMPLETED" as const,
        },
      },
      {
        id: "2",
        globalId: "2",
        codeSerie: "B1-B2_02",
        episodeNumber: 2,
        title: "Episode 2",
        conceptPlaylist: "Playlist 1",
        production: {
          planningStatus: "NOT_STARTED" as const,
          scriptStatus: "NOT_STARTED" as const,
          audioStatus: "NOT_STARTED" as const,
          publicationStatus: "NOT_STARTED" as const,
        },
      },
    ];

    const result = findNextEpisodeToProduce(list);
    expect(result.nextEpisode?.codeSerie).toBe("B1-B2_02");
  });

  it("returns null when all episodes are completed", () => {
    const list = [
      {
        id: "1",
        globalId: "1",
        codeSerie: "B1-B2_01",
        episodeNumber: 1,
        title: "Episode 1",
        conceptPlaylist: "Playlist 1",
        production: {
          planningStatus: "COMPLETED" as const,
          scriptStatus: "COMPLETED" as const,
          audioStatus: "COMPLETED" as const,
          publicationStatus: "COMPLETED" as const,
        },
      },
    ];

    const result = findNextEpisodeToProduce(list);
    expect(result.nextEpisode).toBeNull();
    expect(result.reason).toContain("completed");
  });

  it("enforces allowed state machine transitions", () => {
    expect(isValidStatusTransition("NOT_STARTED", "IN_PROGRESS").valid).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "WAITING_USER").valid).toBe(true);
    expect(isValidStatusTransition("WAITING_USER", "APPROVED").valid).toBe(true);
    expect(isValidStatusTransition("APPROVED", "COMPLETED").valid).toBe(true);

    // Disallowed transition: cannot jump from NOT_STARTED directly to COMPLETED
    expect(isValidStatusTransition("NOT_STARTED", "COMPLETED").valid).toBe(false);
  });
});
