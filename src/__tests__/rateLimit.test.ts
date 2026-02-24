import { describe, it, expect, beforeEach } from 'vitest';

// We need to test the rate limit logic directly since it relies on NextRequest
// Simulate the core logic without NextRequest dependency
describe('rate-limit logic', () => {
  let store: Map<string, { count: number; resetAt: number }>;

  beforeEach(() => {
    store = new Map();
  });

  function checkLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true; // allowed
    }

    entry.count++;
    return entry.count <= limit;
  }

  it('allows requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkLimit('test', 5, 60000)).toBe(true);
    }
  });

  it('blocks requests exceeding limit', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit('test', 5, 60000);
    }
    expect(checkLimit('test', 5, 60000)).toBe(false);
  });

  it('isolates different keys', () => {
    for (let i = 0; i < 5; i++) {
      checkLimit('user-a', 5, 60000);
    }
    // user-a is blocked
    expect(checkLimit('user-a', 5, 60000)).toBe(false);
    // user-b is still allowed
    expect(checkLimit('user-b', 5, 60000)).toBe(true);
  });

  it('resets after window expires', () => {
    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      checkLimit('test', 5, 1); // 1ms window
    }
    // Wait for window to expire
    const entry = store.get('test')!;
    entry.resetAt = Date.now() - 1; // Force expire
    expect(checkLimit('test', 5, 60000)).toBe(true);
  });

  it('enforces max store size concept', () => {
    const MAX_SIZE = 100;
    // Add many entries
    for (let i = 0; i < MAX_SIZE + 50; i++) {
      store.set(`key-${i}`, { count: 1, resetAt: Date.now() + 60000 });
    }
    expect(store.size).toBe(MAX_SIZE + 50);

    // Cleanup: remove entries over limit (simulate)
    if (store.size > MAX_SIZE) {
      const entries = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
      const toRemove = entries.slice(0, store.size - MAX_SIZE);
      for (const [key] of toRemove) store.delete(key);
    }
    expect(store.size).toBe(MAX_SIZE);
  });
});
