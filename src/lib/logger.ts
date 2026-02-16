const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  /** Debug-level: only logs in development */
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  /** Info-level: operational logs, always active on server */
  info: (...args: unknown[]) => {
    console.log(...args);
  },
  /** Warning-level: always active */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  /** Error-level: always active */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
