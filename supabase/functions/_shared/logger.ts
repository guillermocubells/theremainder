/**
 * Structured JSON logger with correlation IDs for Edge Functions.
 *
 * Usage:
 *   import { createLogger, withCorrelationId } from "../_shared/logger.ts";
 *
 *   const { log, requestId } = createLogger("create-checkout", req);
 *   log.info("Checkout started", { items: 3 });
 *   log.error("Payment failed", { error: err.message });
 *
 * Every log line is a single JSON object with:
 *   ts, level, fn, request_id, msg, ...extra
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  fn: string;
  request_id: string;
  msg: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
}

const HEADER_REQUEST_ID = "x-request-id";
const HEADER_CORRELATION_ID = "x-correlation-id";

/**
 * Extract or generate a request ID from headers.
 */
function resolveRequestId(req: Request): string {
  return (
    req.headers.get(HEADER_REQUEST_ID) ||
    req.headers.get(HEADER_CORRELATION_ID) ||
    crypto.randomUUID()
  );
}

function emit(entry: LogEntry) {
  const { level, ...rest } = entry;
  const line = JSON.stringify(rest);
  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
  }
}

/**
 * Create a logger scoped to a function name and request.
 */
export function createLogger(
  functionName: string,
  req: Request
): { log: Logger; requestId: string } {
  const requestId = resolveRequestId(req);

  function write(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      fn: functionName,
      request_id: requestId,
      msg,
      ...extra,
    };
    emit(entry);
  }

  const log: Logger = {
    debug: (msg, extra) => write("debug", msg, extra),
    info: (msg, extra) => write("info", msg, extra),
    warn: (msg, extra) => write("warn", msg, extra),
    error: (msg, extra) => write("error", msg, extra),
  };

  return { log, requestId };
}

/**
 * Append the correlation/request ID to outgoing response headers.
 */
export function withCorrelationId(
  headers: Record<string, string>,
  requestId: string
): Record<string, string> {
  return {
    ...headers,
    "X-Request-Id": requestId,
  };
}
