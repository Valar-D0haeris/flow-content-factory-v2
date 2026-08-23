import { NextRequest, NextResponse } from "next/server";
import { verifyAgentGatewayAuth } from "@/lib/agent-gateway/service";
import { MCP_PROTOCOL_VERSION, MCP_TOOLS, executeMcpTool } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: any;
}

export async function GET(req: NextRequest) {
  const auth = verifyAgentGatewayAuth(req);
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "UNAUTHORIZED: Missing or invalid authentication token. Provide 'Authorization: Bearer <FLOW_AGENT_GATEWAY_KEY>' or 'x-agent-gateway-key' header.",
        },
      },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // MCP Discovery endpoint
  return NextResponse.json(
    {
      name: "flow-content-factory-mcp",
      version: "2.0.0",
      protocolVersion: MCP_PROTOCOL_VERSION,
      description: "Cloud-hosted Model Context Protocol (MCP) Server for Flow Content Factory.",
      tools: MCP_TOOLS,
      status: "ready",
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const auth = verifyAgentGatewayAuth(req);
  if (!auth.isAuthenticated) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: "UNAUTHORIZED: Missing or invalid authentication token. Provide 'Authorization: Bearer <FLOW_AGENT_GATEWAY_KEY>' or 'x-agent-gateway-key' header.",
        },
      },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error: Invalid JSON was received.",
        },
      },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const { id = null, method, params = {} } = body;

  switch (method) {
    case "initialize": {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "flow-content-factory-mcp",
              version: "2.0.0",
            },
          },
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    case "tools/list": {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            tools: MCP_TOOLS,
          },
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return NextResponse.json(
          {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: 'name' is required for tools/call.",
            },
          },
          { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      const toolResult = await executeMcpTool(toolName, toolArgs);

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: toolResult,
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    case "ping": {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {},
        },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    default: {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: '${method}' is not supported by Flow Content Factory MCP Server.`,
          },
        },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-agent-gateway-key, x-mcp-api-key",
    },
  });
}
