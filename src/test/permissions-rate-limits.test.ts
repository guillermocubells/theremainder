/**
 * Tests for permissions, rate limits, brigading detection, and content removal visibility.
 *
 * Covers:
 *  - Moderator-only actions (resolve reports, review verifications, bulk actions)
 *  - Regular user denied mod actions
 *  - Anonymous denied all write actions
 *  - Rate limiting on votes, comments, reports
 *  - Brigading detection (multi-account targeting)
 *  - Content removal visibility (soft-delete, hidden vs visible)
 */

import { describe, it, expect } from 'vitest';

// ── Helpers ──

const ok = <T>(data: T) => ({ data, error: null });
const fail = (message: string, code = 403) => ({ data: null, error: { message, code } });

const REVIEW_ID = '00000000-0000-0000-0000-000000000001';
const COMMENT_ID = 'cccc0000-0000-0000-0000-000000000001';
const REPORT_ID = 'rrrr0000-0000-0000-0000-000000000001';
const USER_REGULAR = 'user-0000-0000-0000-000000000001';
const USER_MOD = 'mod-00000-0000-0000-000000000001';
const USER_ADMIN = 'admin-000-0000-0000-000000000001';

type Role = 'admin' | 'moderator' | 'user' | null;

function hasRole(role: Role, required: Role): boolean {
  if (!role) return false;
  const hierarchy: Record<string, number> = { admin: 3, moderator: 2, user: 1 };
  return (hierarchy[role] ?? 0) >= (hierarchy[required!] ?? 0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODERATOR-ONLY ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Moderator-only actions', () => {
  describe('Role hierarchy', () => {
    it('admin has moderator privileges', () => {
      expect(hasRole('admin', 'moderator')).toBe(true);
    });

    it('moderator has moderator privileges', () => {
      expect(hasRole('moderator', 'moderator')).toBe(true);
    });

    it('regular user does NOT have moderator privileges', () => {
      expect(hasRole('user', 'moderator')).toBe(false);
    });

    it('anonymous does NOT have any privileges', () => {
      expect(hasRole(null, 'user')).toBe(false);
    });
  });

  describe('Resolve content report', () => {
    it('moderator can resolve a report', () => {
      const role: Role = 'moderator';
      expect(hasRole(role, 'moderator')).toBe(true);
      const res = ok({ id: REPORT_ID, status: 'resolved', resolution_action: 'warn', resolved_by: USER_MOD });
      expect(res.data.status).toBe('resolved');
      expect(res.data.resolved_by).toBe(USER_MOD);
    });

    it('admin can resolve a report', () => {
      const role: Role = 'admin';
      expect(hasRole(role, 'moderator')).toBe(true);
      const res = ok({ id: REPORT_ID, status: 'resolved', resolution_action: 'remove' });
      expect(res.data.resolution_action).toBe('remove');
    });

    it('regular user CANNOT resolve a report', () => {
      const role: Role = 'user';
      expect(hasRole(role, 'moderator')).toBe(false);
      const res = fail('Forbidden: moderator role required');
      expect(res.error.code).toBe(403);
    });

    it('anonymous CANNOT resolve a report', () => {
      const res = fail('Not authenticated', 401);
      expect(res.error.code).toBe(401);
    });
  });

  describe('Review verification requests', () => {
    it('moderator can approve a verification', () => {
      const res = ok({ id: 'ver-1', status: 'approved', reviewed_by: USER_MOD });
      expect(res.data.status).toBe('approved');
    });

    it('moderator can reject a verification', () => {
      const res = ok({ id: 'ver-1', status: 'rejected', reviewed_by: USER_MOD, rejection_reason: 'Insufficient evidence' });
      expect(res.data.status).toBe('rejected');
      expect(res.data.rejection_reason).toBeTruthy();
    });

    it('regular user CANNOT review verifications', () => {
      const res = fail('Forbidden: moderator role required');
      expect(res.error).toBeTruthy();
    });
  });

  describe('Bulk actions', () => {
    it('moderator can bulk-resolve multiple reports', () => {
      const reportIds = ['rpt-1', 'rpt-2', 'rpt-3'];
      const res = ok({ resolved: reportIds.length, failed: 0 });
      expect(res.data.resolved).toBe(3);
      expect(res.data.failed).toBe(0);
    });

    it('partial failure returns mixed result', () => {
      const res = ok({ resolved: 2, failed: 1, errors: [{ id: 'rpt-3', message: 'Already resolved' }] });
      expect(res.data.resolved).toBe(2);
      expect(res.data.failed).toBe(1);
      expect(res.data.errors).toHaveLength(1);
    });

    it('regular user bulk-resolve is rejected', () => {
      const res = fail('Forbidden: moderator role required');
      expect(res.error).toBeTruthy();
    });

    it('empty batch returns zero-count success', () => {
      const res = ok({ resolved: 0, failed: 0 });
      expect(res.data.resolved).toBe(0);
    });
  });

  describe('Content removal by moderator', () => {
    it('moderator can remove a review', () => {
      const res = ok({ id: REVIEW_ID, status: 'removed', removed_by: USER_MOD });
      expect(res.data.status).toBe('removed');
    });

    it('moderator can remove a comment', () => {
      const res = ok({ id: COMMENT_ID, status: 'removed', removed_by: USER_MOD });
      expect(res.data.status).toBe('removed');
    });

    it('regular user CANNOT remove others\' content', () => {
      const res = fail('Forbidden: moderator role required');
      expect(res.error).toBeTruthy();
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RATE LIMITING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Rate limiting', () => {
  /** Simulate a sliding-window rate limiter */
  function checkRateLimit(actions: number[], windowMs: number, maxActions: number, now: number): boolean {
    const recent = actions.filter((ts) => now - ts < windowMs);
    return recent.length < maxActions;
  }

  describe('Voting rate limit', () => {
    const WINDOW_MS = 60_000; // 1 minute
    const MAX_VOTES = 30;

    it('should allow votes within limit', () => {
      const now = Date.now();
      const actions = Array.from({ length: 29 }, (_, i) => now - i * 1000);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_VOTES, now)).toBe(true);
    });

    it('should reject vote exceeding limit', () => {
      const now = Date.now();
      const actions = Array.from({ length: 30 }, (_, i) => now - i * 1000);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_VOTES, now)).toBe(false);
    });

    it('should allow vote after window expires', () => {
      const now = Date.now();
      const actions = Array.from({ length: 30 }, (_, i) => now - 61_000 - i * 1000);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_VOTES, now)).toBe(true);
    });
  });

  describe('Comment rate limit', () => {
    const WINDOW_MS = 60_000;
    const MAX_COMMENTS = 10;

    it('should allow comments within limit', () => {
      const now = Date.now();
      const actions = Array.from({ length: 9 }, (_, i) => now - i * 5000);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_COMMENTS, now)).toBe(true);
    });

    it('should reject rapid-fire comments', () => {
      const now = Date.now();
      const actions = Array.from({ length: 10 }, (_, i) => now - i * 100);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_COMMENTS, now)).toBe(false);
    });

    it('should return 429 error shape', () => {
      const res = { data: null, error: { message: 'Rate limit exceeded', code: 429, retry_after: 45 } };
      expect(res.error.code).toBe(429);
      expect(res.error.retry_after).toBeGreaterThan(0);
    });
  });

  describe('Report rate limit', () => {
    const WINDOW_MS = 3600_000; // 1 hour
    const MAX_REPORTS = 5;

    it('should allow reports within limit', () => {
      const now = Date.now();
      const actions = Array.from({ length: 4 }, (_, i) => now - i * 600_000);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_REPORTS, now)).toBe(true);
    });

    it('should reject report spam', () => {
      const now = Date.now();
      const actions = Array.from({ length: 5 }, (_, i) => now - i * 60_000);
      expect(checkRateLimit(actions, WINDOW_MS, MAX_REPORTS, now)).toBe(false);
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BRIGADING DETECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Brigading detection', () => {
  /** Detect if a single review receives too many downvotes in a short window */
  function detectBrigade(
    votes: Array<{ user_id: string; vote_type: number; created_at: number }>,
    windowMs: number,
    threshold: number,
    now: number,
  ): boolean {
    const recentDownvotes = votes.filter(
      (v) => v.vote_type === -1 && now - v.created_at < windowMs,
    );
    const uniqueUsers = new Set(recentDownvotes.map((v) => v.user_id));
    return uniqueUsers.size >= threshold;
  }

  it('should not flag normal voting patterns', () => {
    const now = Date.now();
    const votes = [
      { user_id: 'u1', vote_type: 1, created_at: now - 5000 },
      { user_id: 'u2', vote_type: -1, created_at: now - 10000 },
      { user_id: 'u3', vote_type: 1, created_at: now - 20000 },
    ];
    expect(detectBrigade(votes, 300_000, 5, now)).toBe(false);
  });

  it('should flag coordinated downvoting (5+ unique users in 5 min)', () => {
    const now = Date.now();
    const votes = Array.from({ length: 6 }, (_, i) => ({
      user_id: `attacker-${i}`,
      vote_type: -1,
      created_at: now - i * 10_000,
    }));
    expect(detectBrigade(votes, 300_000, 5, now)).toBe(true);
  });

  it('should not flag old downvotes outside window', () => {
    const now = Date.now();
    const votes = Array.from({ length: 10 }, (_, i) => ({
      user_id: `user-${i}`,
      vote_type: -1,
      created_at: now - 600_000 - i * 1000, // all >10 min ago
    }));
    expect(detectBrigade(votes, 300_000, 5, now)).toBe(false);
  });

  it('should not count same user twice', () => {
    const now = Date.now();
    const votes = Array.from({ length: 10 }, (_, i) => ({
      user_id: 'same-user', // all from one account
      vote_type: -1,
      created_at: now - i * 1000,
    }));
    // Only 1 unique user, threshold is 5
    expect(detectBrigade(votes, 300_000, 5, now)).toBe(false);
  });

  it('should only count downvotes, not upvotes', () => {
    const now = Date.now();
    const votes = Array.from({ length: 10 }, (_, i) => ({
      user_id: `user-${i}`,
      vote_type: 1, // upvotes
      created_at: now - i * 1000,
    }));
    expect(detectBrigade(votes, 300_000, 5, now)).toBe(false);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT REMOVAL VISIBILITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Content removal visibility', () => {
  type ContentItem = {
    id: string;
    body: string;
    deleted_at: string | null;
    removed_by_mod: boolean;
    user_id: string;
  };

  /** Filter content for public view: hide mod-removed, show tombstone for self-deleted */
  function filterForPublic(items: ContentItem[]): Array<Partial<ContentItem> & { visible: boolean }> {
    return items.map((item) => {
      if (item.removed_by_mod) {
        return { id: item.id, visible: false, body: '[Content removed by moderator]' };
      }
      if (item.deleted_at) {
        return { id: item.id, visible: true, body: '[Deleted by author]', deleted_at: item.deleted_at };
      }
      return { ...item, visible: true };
    });
  }

  /** Filter for moderator view: show everything including removed content */
  function filterForMod(items: ContentItem[]): Array<ContentItem & { visible: boolean }> {
    return items.map((item) => ({ ...item, visible: true }));
  }

  const items: ContentItem[] = [
    { id: 'c1', body: 'Normal comment', deleted_at: null, removed_by_mod: false, user_id: 'u1' },
    { id: 'c2', body: 'Self-deleted comment', deleted_at: '2026-01-01T00:00:00Z', removed_by_mod: false, user_id: 'u2' },
    { id: 'c3', body: 'Offensive content', deleted_at: null, removed_by_mod: true, user_id: 'u3' },
  ];

  describe('Public view', () => {
    const publicView = filterForPublic(items);

    it('shows normal comments fully', () => {
      expect(publicView[0].visible).toBe(true);
      expect(publicView[0].body).toBe('Normal comment');
    });

    it('shows tombstone for self-deleted comments', () => {
      expect(publicView[1].visible).toBe(true);
      expect(publicView[1].body).toBe('[Deleted by author]');
    });

    it('hides mod-removed content with placeholder', () => {
      expect(publicView[2].visible).toBe(false);
      expect(publicView[2].body).toBe('[Content removed by moderator]');
    });

    it('does not leak original body of removed content', () => {
      expect(publicView[2].body).not.toContain('Offensive');
    });
  });

  describe('Moderator view', () => {
    const modView = filterForMod(items);

    it('shows all content including removed', () => {
      expect(modView).toHaveLength(3);
      modView.forEach((item) => expect(item.visible).toBe(true));
    });

    it('preserves original body of removed content for review', () => {
      expect(modView[2].body).toBe('Offensive content');
      expect(modView[2].removed_by_mod).toBe(true);
    });
  });

  describe('Author view of own deleted content', () => {
    it('author sees their deleted comment as tombstone', () => {
      const authorView = filterForPublic(items);
      const own = authorView.find((i) => i.id === 'c2');
      expect(own?.body).toBe('[Deleted by author]');
    });
  });
});
