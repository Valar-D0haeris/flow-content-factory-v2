import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/db/repository";

export const GATEWAY_DEFAULT_TIMEOUT_MS = 8000;

export interface AgentAuthResult {
  isAuthenticated: boolean;
  error?: string;
}

export function verifyAgentGatewayAuth(req: NextRequest): AgentAuthResult {
  const gatewayKey =
    process.env.FLOW_AGENT_GATEWAY_KEY ||
    process.env.GPT_API_KEY ||
    "fcf_agent_gtw_a91f4e3c8b27d05164ea7290bc3518";

  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  const xGatewayKey = req.headers.get("x-agent-gateway-key");

  let providedToken: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedToken = authHeader.slice(7).trim();
  } else if (xGatewayKey) {
    providedToken = xGatewayKey.trim();
  } else if (xApiKey) {
    providedToken = xApiKey.trim();
  }

  if (!providedToken) {
    return {
      isAuthenticated: false,
      error: "Missing Agent Gateway authentication token. Provide 'Authorization: Bearer <FLOW_AGENT_GATEWAY_KEY>' or 'x-agent-gateway-key' header.",
    };
  }

  // Accept FLOW_AGENT_GATEWAY_KEY, GPT_API_KEY, or ADMIN_API_KEY
  const validKeys = [
    gatewayKey,
    process.env.FLOW_AGENT_GATEWAY_KEY,
    process.env.GPT_API_KEY,
    process.env.ADMIN_API_KEY,
  ].filter(Boolean);

  if (!validKeys.includes(providedToken)) {
    return {
      isAuthenticated: false,
      error: "Invalid Agent Gateway token provided.",
    };
  }

  return {
    isAuthenticated: true,
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = GATEWAY_DEFAULT_TIMEOUT_MS,
  operationName: string = "Operation"
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`UPSTREAM_TIMEOUT: ${operationName} exceeded ${timeoutMs}ms limit.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

export function createGatewayErrorResponse(error: any, status: number = 500) {
  const message = error?.message || "Internal Gateway Error";
  let code = "INTERNAL_GATEWAY_ERROR";

  if (message.includes("UPSTREAM_TIMEOUT")) {
    code = "UPSTREAM_TIMEOUT";
    status = 504;
  } else if (message.includes("UPSTREAM_UNAVAILABLE") || message.includes("Neon query failed")) {
    code = "UPSTREAM_UNAVAILABLE";
    status = 503;
  } else if (message.includes("UNAUTHORIZED")) {
    code = "UNAUTHORIZED";
    status = 401;
  } else if (message.includes("EPISODE_NOT_FOUND") || message.includes("not found")) {
    code = "NOT_FOUND";
    status = 404;
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: message.replace(/postgresql:\/\/[^@]+@/g, "postgresql://***:***@"), // sanitize any connection string leak
      },
      meta: {
        gateway: "Flow Content Factory Agent Gateway v1",
        timestamp: new Date().toISOString(),
      },
    },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
