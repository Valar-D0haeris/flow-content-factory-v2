import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getEpisodesStatus } from "@/app/api/v1/episodes/status/route";
import { GET as getEpisodeCodeStatus } from "@/app/api/v1/episodes/[code]/status/route";
import { GET as getOpenApiJson } from "@/app/api/openapi.json/route";
import { GET as getProductionNext } from "@/app/api/v1/production/next/route";
import { GET as getEpisodes } from "@/app/api/v1/episodes/route";
import { NextRequest } from "next/server";

// Load .env.local if available in test context
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

const VALID_KEY = process.env.GPT_API_KEY || "fcf_live_prod_5d94f1195da6fa33e9eda9643dcb1b2d0a80f1a613b3db1c";
const INVALID_KEY = "fcf_invalid_key_123456";

describe("PostgreSQL Neon Source of Truth & API Reliability Tests", () => {
  it("1. GET /api/health returns 200 and connected status", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.database).toBe("connected");
  });

  it("2. GET /api/v1/episodes/status with valid key returns all 45 episodes from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodesStatus(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.episodes.length).toBe(45);
  });

  it("3. GET /api/v1/episodes/EP#01/status returns EP01 from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/EP#01/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP#01" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalId).toBe("EP#01");
    expect(body.code).toBe("B1-B2_01");
  });

  it("4. GET /api/v1/episodes/EP02/status returns EP02 from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/EP02/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP02" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalId).toBe("EP#02");
  });

  it("5. GET /api/v1/episodes/EP03/status returns EP03 from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/EP03/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP03" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalId).toBe("EP#03");
  });

  it("6. GET /api/v1/episodes/EP04/status returns EP04 from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/EP04/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP04" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalId).toBe("EP#04");
  });

  it("7. GET /api/v1/episodes/EP05/status returns EP05 from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/EP05/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP05" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalId).toBe("EP#05");
  });

  it("8. GET /api/v1/episodes/EP06/status returns EP06 from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/episodes/EP06/status", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP06" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.globalId).toBe("EP#06");
  });

  it("9. GET /api/v1/production/next points to next episode to produce", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/production/next", {
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await getProductionNext(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.meta.source).toBe("neon_postgresql");
  });

  it("10. GET /api/openapi.json returns valid JSON", async () => {
    const res = await getOpenApiJson();
    expect(res.status).toBe(200);
    const text = await res.text();
    const parsed = JSON.parse(text);
    expect(parsed.openapi).toBe("3.1.0");
  });
});
