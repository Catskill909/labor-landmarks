/**
 * Security helpers for the Labor Landmarks API. Pure functions, unit-tested in
 * security.test.ts; the HTTP-level checks live in scripts/security-check.ts.
 */
import crypto from 'crypto';

/** Compare two secrets in constant time, so response timing doesn't leak how much matched. */
export function safeEqual(a: string, b: string): boolean {
    // Hash first: timingSafeEqual needs equal-length buffers, and hashing avoids
    // leaking the password's length through an early length check.
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
}

/** True when the request's Authorization header carries the admin password. */
export function isAdminRequest(authHeader: string | undefined, adminPassword: string | undefined): boolean {
    if (!adminPassword) return true; // no password configured = local dev convenience (same as adminAuth)
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    return safeEqual(authHeader.slice('Bearer '.length), adminPassword);
}

// ─── One-time photo upload keys for public suggestions ───────────────────────
// A public suggestion gets a short-lived key that lets its submitter attach
// photos to THAT suggestion only. The key is an HMAC of the landmark id and an
// expiry time, so the server stores nothing. The secret is random per process:
// a restart invalidates outstanding keys, which only matters to someone
// mid-submission during a deploy.

export const UPLOAD_KEY_TTL_MS = 15 * 60 * 1000;
const UPLOAD_KEY_SECRET = crypto.randomBytes(32);

function sign(landmarkId: number, expiresAt: number, secret: Buffer): string {
    return crypto.createHmac('sha256', secret).update(`${landmarkId}.${expiresAt}`).digest('base64url');
}

export function createUploadKey(landmarkId: number, now = Date.now(), secret = UPLOAD_KEY_SECRET): string {
    const expiresAt = now + UPLOAD_KEY_TTL_MS;
    return `${expiresAt}.${sign(landmarkId, expiresAt, secret)}`;
}

export function verifyUploadKey(key: string | undefined, landmarkId: number, now = Date.now(), secret = UPLOAD_KEY_SECRET): boolean {
    if (!key || !Number.isInteger(landmarkId)) return false;
    const dot = key.indexOf('.');
    if (dot <= 0) return false;
    const expiresAt = Number(key.slice(0, dot));
    if (!Number.isFinite(expiresAt) || now > expiresAt) return false;
    const expected = sign(landmarkId, expiresAt, secret);
    const given = key.slice(dot + 1);
    if (given.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Most photos a public suggestion may carry in total. */
export const PUBLIC_MAX_IMAGES = 10;

// ─── What the public may see ─────────────────────────────────────────────────

const PRIVATE_FIELDS = ['submitterName', 'submitterEmail', 'submitterComment'] as const;

/** Strip submitter contact details. Every public response must go through this. */
export function toPublicLandmark<T extends Record<string, unknown>>(landmark: T): Omit<T, typeof PRIVATE_FIELDS[number]> {
    const copy: Record<string, unknown> = { ...landmark };
    for (const f of PRIVATE_FIELDS) delete copy[f];
    return copy as Omit<T, typeof PRIVATE_FIELDS[number]>;
}
