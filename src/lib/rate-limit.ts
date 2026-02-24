import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10_000;

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 300_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  // Remove expired entries
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
  // If still over limit, evict oldest entries
  if (store.size > MAX_STORE_SIZE) {
    const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const toRemove = entries.slice(0, store.size - MAX_STORE_SIZE);
    for (const [key] of toRemove) store.delete(key);
  }
}

function getClientIdentifier(req: NextRequest): string {
  // Use SHA-256 hash of full JWT payload for collision-resistant user identification
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length === 3) {
      const hash = crypto.createHash('sha256').update(parts[1]).digest('hex').substring(0, 16);
      return `user:${hash}`;
    }
  }

  // Fall back to IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`;
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return `ip:${realIp}`;
  return 'ip:unknown';
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

/**
 * Check rate limit for a request. Returns null if allowed, or a Response if blocked.
 */
export function rateLimit(
  req: NextRequest,
  routeKey: string,
  config: RateLimitConfig
): NextResponse | null {
  cleanup();

  const identifier = getClientIdentifier(req);
  const key = `${routeKey}:${identifier}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  return null;
}

/** Preset configs for common route types */
export const RATE_LIMITS = {
  /** PDF generation / export — expensive, 5 per minute */
  expensive: { limit: 5, windowSeconds: 60 } as RateLimitConfig,
  /** Standard authenticated routes — 30 per minute */
  standard: { limit: 30, windowSeconds: 60 } as RateLimitConfig,
  /** Auth / trial check — 20 per minute */
  auth: { limit: 20, windowSeconds: 60 } as RateLimitConfig,
  /** Payment operations — 10 per minute */
  payment: { limit: 10, windowSeconds: 60 } as RateLimitConfig,
};
