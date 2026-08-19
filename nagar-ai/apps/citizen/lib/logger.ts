type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, data ?? "");
}
