/**
 * Utilities to parse and format duration between human-readable strings and canonical seconds.
 * 
 * Examples:
 * - "23:18" -> 1398
 * - "23 minutes 18 secondes" -> 1398
 * - "23 min 18 s" -> 1398
 * - "1h 05m 12s" -> 3912
 * - "1398" -> 1398
 * - "1398s" -> 1398
 * - 1398 -> "23:18" or "23m 18s"
 */

export function parseDurationToSeconds(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === "number") return isNaN(input) ? 0 : Math.max(0, Math.floor(input));

  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Pure integer / seconds check: "1398" or "1398s" or "1398 sec"
  if (/^\d+\s*(s|sec|secondes?|seconds?)?$/i.test(trimmed)) {
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Format "MM:SS" or "HH:MM:SS"
  if (/^\d+(:\d+)+$/.test(trimmed)) {
    const parts = trimmed.split(":").map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) {
      const [mins, secs] = parts;
      return mins * 60 + secs;
    }
    if (parts.length === 3) {
      const [hrs, mins, secs] = parts;
      return hrs * 3600 + mins * 60 + secs;
    }
  }

  // Natural language string: "23 minutes 18 secondes", "1h 12m 30s", etc.
  let totalSeconds = 0;
  let matched = false;

  const hoursMatch = trimmed.match(/(\d+)\s*(h|heure|heures|hours?)/i);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    matched = true;
  }

  const minsMatch = trimmed.match(/(\d+)\s*(m|min|minute|minutes)/i);
  if (minsMatch) {
    totalSeconds += parseInt(minsMatch[1], 10) * 60;
    matched = true;
  }

  const secsMatch = trimmed.match(/(\d+)\s*(s|sec|seconde|secondes|seconds?)/i);
  if (secsMatch) {
    totalSeconds += parseInt(secsMatch[1], 10);
    matched = true;
  }

  if (matched) {
    return totalSeconds;
  }

  // Fallback: try parsing generic number
  const genericNumber = parseInt(trimmed, 10);
  return isNaN(genericNumber) ? 0 : Math.max(0, genericNumber);
}

export function formatSecondsToTime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "00:00";
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatSecondsToHuman(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0 sec";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}
