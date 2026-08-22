import { describe, it, expect } from "vitest";
import { parseDurationToSeconds, formatSecondsToTime, formatSecondsToHuman } from "@/lib/duration/duration";

describe("Duration Parser and Formatter", () => {
  it("parses MM:SS formatted duration strings", () => {
    expect(parseDurationToSeconds("23:18")).toBe(1398);
    expect(parseDurationToSeconds("05:30")).toBe(330);
    expect(parseDurationToSeconds("00:45")).toBe(45);
  });

  it("parses HH:MM:SS formatted duration strings", () => {
    expect(parseDurationToSeconds("01:05:12")).toBe(3912);
  });

  it("parses natural French/English duration strings", () => {
    expect(parseDurationToSeconds("23 minutes 18 secondes")).toBe(1398);
    expect(parseDurationToSeconds("23 min 18 s")).toBe(1398);
    expect(parseDurationToSeconds("1h 10m 05s")).toBe(4205);
    expect(parseDurationToSeconds("45 seconds")).toBe(45);
  });

  it("parses raw seconds as string or number", () => {
    expect(parseDurationToSeconds("1398")).toBe(1398);
    expect(parseDurationToSeconds("1398s")).toBe(1398);
    expect(parseDurationToSeconds(1398)).toBe(1398);
  });

  it("handles empty or invalid duration inputs gracefully", () => {
    expect(parseDurationToSeconds("")).toBe(0);
    expect(parseDurationToSeconds(null)).toBe(0);
    expect(parseDurationToSeconds(undefined)).toBe(0);
    expect(parseDurationToSeconds("invalid text")).toBe(0);
  });

  it("formats seconds to standard clock format MM:SS and HH:MM:SS", () => {
    expect(formatSecondsToTime(1398)).toBe("23:18");
    expect(formatSecondsToTime(3912)).toBe("01:05:12");
    expect(formatSecondsToTime(0)).toBe("00:00");
    expect(formatSecondsToTime(null)).toBe("00:00");
  });

  it("formats seconds to human-readable strings", () => {
    expect(formatSecondsToHuman(1398)).toBe("23m 18s");
    expect(formatSecondsToHuman(3912)).toBe("1h 5m 12s");
    expect(formatSecondsToHuman(45)).toBe("45s");
  });
});
