import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getAgentHealth } from "@/app/api/agent/health/route";
import { GET as getAgentEpisodesStatus } from "@/app/api/agent/episodes/status/route";
import { GET as getAgentEpisodeCodeStatus } from "@/app/api/agent/episodes/[code]/status/route";
import { GET as getAgentProductionNext } from "@/app/api/agent/production/next/route";

// Load .env.local if available
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

const GATEWAY_KEY = process.env.FLOW_AGENT_GATEWAY_KEY || process.env.GPT_API_KEY || "fcf_agent_gtw_a91f4e3c8b27d05164ea7290bc3518";
const INVALID_KEY = "fcf_invalid_gateway_key_xyz";

describe("Agent Gateway Security & Isolation Tests", () => {
  it("1. GET /api/agent/health without auth returns 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/health");
    const res = await getAgentHealth(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.status).toBe("unauthorized");
  });

  it("2. GET /api/agent/health with invalid key returns 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/health", {
      headers: { Authorization: `Bearer ${INVALID_KEY}` },
    });
    const res = await getAgentHealth(req);
    expect(res.status).toBe(401);
  });

  it("3. GET /api/agent/health with valid key returns 200 and healthy services", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/health", {
      headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
    });
    const res = await getAgentHealth(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.gateway).toBe("ok");
    expect(body.flowApi).toBe("ok");
    expect(body.database).toBe("connected");
  });

  it("4. GET /api/agent/episodes/status returns 45 episodes from Neon", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/episodes/status", {
      headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
    });
    const res = await getAgentEpisodesStatus(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.episodes.length).toBe(45);
    expect(body.meta.source).toBe("neon_postgresql");
  });

  it("5. GET /api/agent/episodes/EP#01/status returns EP01 data", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/episodes/EP#01/status", {
      headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
    });
    const res = await getAgentEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP#01" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.globalId).toBe("EP#01");
    expect(body.data.status).toBe("COMPLETED");
  });

  it("6. GET /api/agent/episodes/EP06/status returns EP06 data intact", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/episodes/EP06/status", {
      headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
    });
    const res = await getAgentEpisodeCodeStatus(req, {
      params: Promise.resolve({ code: "EP06" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.globalId).toBe("EP#06");
    expect(body.data.status).toBe("NOT_STARTED");
  });

  it("7. GET /api/agent/production/next returns current next episode without leaking secrets", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/production/next", {
      headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
    });
    const res = await getAgentProductionNext(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.identity.globalId).toBe("EP#03");
    expect(body.meta.source).toBe("neon_postgresql");

    const jsonStr = JSON.stringify(body);
    expect(jsonStr).not.toContain("postgresql://");
    expect(jsonStr).not.toContain("npg_");
    expect(jsonStr).not.toContain("fcf_");
  });
});
