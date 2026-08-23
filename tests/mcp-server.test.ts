import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMcp, POST as postMcp } from "@/app/api/mcp/route";

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
const INVALID_KEY = "fcf_invalid_key_xyz";

describe("Flow Content Factory MCP Server Protocol Tests", () => {
  it("1. GET /api/mcp without auth returns 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp");
    const res = await getMcp(req);
    expect(res.status).toBe(401);
  });

  it("2. GET /api/mcp with auth returns 200 and tools definitions", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      headers: { Authorization: `Bearer ${GATEWAY_KEY}` },
    });
    const res = await getMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("flow-content-factory-mcp");
    expect(body.tools.length).toBe(4);
  });

  it("3. POST /api/mcp 'initialize' returns MCP capabilities", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05" },
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("flow-content-factory-mcp");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  it("4. POST /api/mcp 'tools/list' returns all 4 standard tools", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const toolNames = body.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("get_episodes_status");
    expect(toolNames).toContain("get_episode_status");
    expect(toolNames).toContain("get_next_production");
    expect(toolNames).toContain("get_episode_context");
  });

  it("5. POST /api/mcp 'tools/call' -> get_episodes_status", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_episodes_status", arguments: {} },
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const content = JSON.parse(body.result.content[0].text);
    expect(content.total).toBe(45);
    expect(content.source).toBe("neon_postgresql");
  });

  it("6. POST /api/mcp 'tools/call' -> get_episode_status (valid code EP#01)", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "get_episode_status", arguments: { episodeCode: "EP#01" } },
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const content = JSON.parse(body.result.content[0].text);
    expect(content.globalId).toBe("EP#01");
    expect(content.status).toBe("COMPLETED");
  });

  it("7. POST /api/mcp 'tools/call' -> get_episode_status (non-existent code)", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "get_episode_status", arguments: { episodeCode: "INVALID_CODE_999" } },
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("INVALID_EPISODE");
  });

  it("8. POST /api/mcp 'tools/call' -> get_next_production", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "get_next_production", arguments: {} },
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const content = JSON.parse(body.result.content[0].text);
    expect(content.episode.globalId).toBe("EP#03");
    expect(content.source).toBe("neon_postgresql");
  });

  it("9. POST /api/mcp 'tools/call' -> get_episode_context", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "get_episode_context", arguments: { episodeCode: "MIND-01" } },
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const content = JSON.parse(body.result.content[0].text);
    expect(content.identity.codeSerie).toBe("MIND-01");
    expect(content.editorial.hook).toBeDefined();
  });

  it("10. POST /api/mcp 'ping' returns empty result", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 8,
        method: "ping",
      }),
    });
    const res = await postMcp(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toEqual({});
  });
});
