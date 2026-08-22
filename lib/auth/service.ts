import { NextRequest } from "next/server";

export type AuthRole = "ADMIN" | "GPT_PRODUCTION" | "GPT_READONLY" | "ANONYMOUS";

export interface AuthResult {
  isAuthenticated: boolean;
  role: AuthRole;
  error?: string;
}

export function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) {
    return xApiKey.trim();
  }
  return null;
}

export function verifyAuth(req: NextRequest, requiredRole?: "READ" | "WRITE" | "ADMIN"): AuthResult {
  const token = extractApiKey(req);
  
  const adminKey = process.env.ADMIN_API_KEY || "fcf_live_admin_secret_key_9999";
  const gptKey = process.env.GPT_API_KEY || "fcf_live_gpt_prod_secret_key_8923";
  const gptReadOnlyKey = process.env.GPT_READONLY_KEY || "fcf_live_gpt_readonly_key_1042";

  // If no token provided
  if (!token) {
    // In dev mode or internal UI requests, we can allow or check session
    const isInternal = req.headers.get("x-internal-request") === "true";
    if (isInternal) {
      return { isAuthenticated: true, role: "ADMIN" };
    }
    return {
      isAuthenticated: false,
      role: "ANONYMOUS",
      error: "Missing API Key in Authorization: Bearer <key> or x-api-key header",
    };
  }

  if (token === adminKey) {
    return { isAuthenticated: true, role: "ADMIN" };
  }

  if (token === gptKey) {
    if (requiredRole === "ADMIN") {
      return {
        isAuthenticated: false,
        role: "GPT_PRODUCTION",
        error: "Insufficient permissions: ADMIN role required",
      };
    }
    return { isAuthenticated: true, role: "GPT_PRODUCTION" };
  }

  if (token === gptReadOnlyKey) {
    if (requiredRole === "WRITE" || requiredRole === "ADMIN") {
      return {
        isAuthenticated: false,
        role: "GPT_READONLY",
        error: "Insufficient permissions: write operation not permitted for READONLY key",
      };
    }
    return { isAuthenticated: true, role: "GPT_READONLY" };
  }

  return {
    isAuthenticated: false,
    role: "ANONYMOUS",
    error: "Invalid API Key",
  };
}
