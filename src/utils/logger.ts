// src/utils/logger.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function emit(level: LogLevel, msg: string, meta?: unknown): void {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;
  const ts = new Date().toISOString();
  const line = meta !== undefined
    ? `[${ts}] ${level.toUpperCase()} ${msg} ${JSON.stringify(meta)}`
    : `[${ts}] ${level.toUpperCase()} ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info:  (msg: string, meta?: unknown) => emit('info',  msg, meta),
  warn:  (msg: string, meta?: unknown) => emit('warn',  msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
