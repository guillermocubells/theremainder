/**
 * Standardized error envelopes and handler for Edge Functions.
 *
 * Usage:
 *   import { AppError, handleError, errorResponse } from "../_shared/errors.ts";
 *
 *   // Throw typed errors
 *   throw new AppError("Plant not found", 404, "PLANT_NOT_FOUND");
 *
 *   // Catch-all handler in the outermost try/catch
 *   return handleError(err, corsHeaders, requestId, log);
 *
 *   // Quick one-off error response
 *   return errorResponse("Bad input", 400, corsHeaders, requestId, "BAD_INPUT");
 */

import type { Logger } from "./logger.ts";

// ── Application Error ──

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code = "BAD_REQUEST",
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ── Error envelope shape ──

export interface ErrorEnvelope {
  error: {
    message: string;
    code: string;
    request_id?: string;
    details?: unknown;
  };
}

// ── Build an error Response ──

export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  requestId?: string,
  code = "ERROR",
  details?: unknown
): Response {
  const body: ErrorEnvelope = {
    error: {
      message,
      code,
      ...(requestId ? { request_id: requestId } : {}),
      ...(details !== undefined ? { details } : {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(requestId ? { "X-Request-Id": requestId } : {}),
    },
  });
}

// ── Catch-all handler ──

export function handleError(
  err: unknown,
  corsHeaders: Record<string, string>,
  requestId?: string,
  log?: Logger
): Response {
  if (err instanceof AppError) {
    log?.warn("AppError", {
      code: err.code,
      status: err.statusCode,
      message: err.message,
    });
    return errorResponse(
      err.message,
      err.statusCode,
      corsHeaders,
      requestId,
      err.code,
      err.details
    );
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const stack = err instanceof Error ? err.stack : undefined;

  log?.error("Unhandled error", { message, stack });

  return errorResponse(
    "Internal server error",
    500,
    corsHeaders,
    requestId,
    "INTERNAL_ERROR"
  );
}
