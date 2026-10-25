/**
 * Security check for the Labor Landmarks API.
 *
 *   npx tsx scripts/security-check.ts                          # static check only
 *   BASE=http://localhost:3099 ADMIN_PASSWORD=x npx tsx scripts/security-check.ts
 *
 * Static part (always runs): every route that changes data, and every
 * /api/admin route, must carry an auth guard unless it is on the allow-list
 * below. This is the check that would have caught the Oct 2026 holes (PUT,
 * DELETE and image upload were open to anyone) - and catches the next new
 * route someone forgets to protect.
 *
 * Live part (when BASE is set): sends real requests to a running server.
 * Point it at a TEST server with a throwaway database - it creates and edits
 * rows. Never at production.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

let failures = 0;
const ok = (cond: boolean, label: string, detail = '') => {
    if (cond) console.log(`  PASS  ${label}`);
    else { failures++; console.log(`  FAIL  ${label}${detail ? '  -> ' + detail : ''}`); }
};

// ─── Static: every write route is guarded ───────────────────────────────────
const GUARDS = ['adminAuth', 'imageUploadAuth'];
// Routes that are deliberately public. Adding to this list is a security decision.
const PUBLIC_WRITES = new Set([
    'POST /api/admin/verify-password', // the login itself
    'POST /api/landmarks',             // public suggestions (server forces isPublished=false)
]);

console.log('Static route check (server/index.ts)');
const src = fs.readFileSync(path.join(import.meta.dirname, '../server/index.ts'), 'utf8');
const routeRe = /^app\.(get|post|put|patch|delete)\(\s*'([^']+)'\s*,([^\n]*)/gm;
let routeCount = 0;
for (const m of src.matchAll(routeRe)) {
    const [, verb, route, rest] = m;
    const key = `${verb.toUpperCase()} ${route}`;
    const needsGuard = verb !== 'get' || route.startsWith('/api/admin');
    if (!needsGuard) continue;
    routeCount++;
    const guarded = GUARDS.some(g => new RegExp(`\\b${g}\\b`).test(rest));
    ok(guarded || PUBLIC_WRITES.has(key), `${key} is guarded`, 'no auth middleware and not on the public allow-list');
}
ok(routeCount >= 8, `found the routes (${routeCount})`, 'regex no longer matches route declarations - fix the check');
// Router-style declarations would slip past the regex above; refuse them until the check covers them.
ok(!/\b(router|app)\.(route|use)\(\s*'\/api\/(landmarks|admin)/.test(src), 'no router-style route declarations');

// ─── Live checks ────────────────────────────────────────────────────────────
const BASE = process.env.BASE;
const PW = process.env.ADMIN_PASSWORD;

async function live() {
    if (!BASE || !PW) { console.log('\n(BASE / ADMIN_PASSWORD not set - live checks skipped)'); return; }
    const admin = { Authorization: `Bearer ${PW}` };
    const json = { 'Content-Type': 'application/json' };
    const get = (p: string, h: Record<string, string> = {}) => fetch(BASE + p, { headers: h });
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#c00' } }).png().toBuffer();
    const form = (n = 1) => { const f = new FormData(); for (let i = 0; i < n; i++) f.append('images', new Blob([new Uint8Array(png)], { type: 'image/png' }), `t${i}.png`); return f; };
    const PRIVATE = ['submitterName', 'submitterEmail', 'submitterComment'];
    const leaks = (o: Record<string, unknown>) => PRIVATE.filter(k => k in o);

    console.log(`\nLive checks against ${BASE}`);

    // Health
    const h = await get('/api/health');
    ok(h.status === 200 && (await h.json()).status === 'ok', 'GET /api/health is a real check (200 ok)');

    // Security headers
    ok(!!h.headers.get('content-security-policy'), 'Content-Security-Policy header present');
    ok(h.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy set');

    // Public list leaks nothing private and holds only published rows
    const listRes = await get('/api/landmarks');
    const list = await listRes.json() as Record<string, unknown>[];
    ok(list.length > 0, `public list returns landmarks (${list.length})`);
    ok(list.every(l => leaks(l).length === 0), 'public list has no submitter fields');
    ok(list.every(l => l.isPublished !== false), 'public list has no unpublished rows');

    // Find an unpublished row via the admin list
    const adminList = await (await get('/api/admin/landmarks', admin)).json() as Record<string, unknown>[];
    const hidden = adminList.find(l => l.isPublished === false);
    const published = adminList.find(l => l.isPublished === true && (l.submitterEmail || l.submitterName));
    ok(!!hidden, 'test DB has an unpublished row to probe');

    if (hidden) {
        ok((await get(`/api/landmarks/${hidden.id}`)).status === 404, 'GET unpublished :id without auth -> 404');
        ok((await get(`/api/landmarks/${hidden.id}`, admin)).status === 200, 'GET unpublished :id as admin -> 200');
    }
    if (published) {
        const one = await (await get(`/api/landmarks/${published.id}`)).json();
        ok(leaks(one).length === 0, 'GET published :id without auth has no submitter fields', leaks(one).join(','));
        const asAdmin = await (await get(`/api/landmarks/${published.id}`, admin)).json();
        ok(leaks(asAdmin).length > 0, 'GET published :id as admin still includes submitter fields');
    }

    // Every guarded write refuses an anonymous caller and a wrong password
    const target = published ?? list[0];
    const tid = target.id;
    const attempts: [string, string, RequestInit][] = [
        ['PUT', `/api/landmarks/${tid}`, { method: 'PUT', headers: json, body: JSON.stringify({ name: 'HACKED' }) }],
        ['DELETE', `/api/landmarks/${tid}`, { method: 'DELETE' }],
        ['POST image', `/api/landmarks/${tid}/images`, { method: 'POST', body: form() }],
        ['DELETE image', `/api/landmarks/${tid}/images/1`, { method: 'DELETE' }],
        ['POST import', '/api/admin/import', { method: 'POST', headers: json, body: '[]' }],
        ['DELETE clear', '/api/admin/clear', { method: 'DELETE' }],
        ['GET backup', '/api/admin/backup', {}],
        ['GET admin list', '/api/admin/landmarks', {}],
    ];
    for (const [label, p, init] of attempts) {
        const anon = await fetch(BASE + p, init);
        ok(anon.status === 401, `${label} without auth -> 401`, String(anon.status));
        const init2 = { ...init, headers: { ...(init.headers as Record<string, string> ?? {}), Authorization: 'Bearer wrong-password' } };
        if (init.body instanceof FormData) init2.body = form();
        const wrong = await fetch(BASE + p, init2);
        ok(wrong.status === 401, `${label} with wrong password -> 401`, String(wrong.status));
    }
    const still = await (await get(`/api/landmarks/${tid}`, admin)).json();
    ok(still.name === target.name, 'target landmark unchanged after the attempts');

    // Public suggestion: forced unpublished, gets an upload key, echoes nothing private
    const sugRes = await fetch(BASE + '/api/landmarks', {
        method: 'POST', headers: json,
        body: JSON.stringify({ name: 'SECURITY TEST suggestion', city: 'Testville', state: 'TS', country: 'USA', category: 'Test',
            description: 'x', address: 'x', lat: 40, lng: -75, isPublished: true,
            submitterName: 'Tester', submitterEmail: 'tester@example.com' }),
    });
    ok(sugRes.status === 201, 'public suggestion accepted (201)');
    const sug = await sugRes.json();
    ok(typeof sug.uploadKey === 'string', 'suggestion response carries an upload key');
    ok(leaks(sug).length === 0, 'suggestion response echoes no submitter fields');
    const sugAdmin = await (await get(`/api/landmarks/${sug.id}`, admin)).json();
    ok(sugAdmin.isPublished === false, 'isPublished:true in a public suggestion is ignored (stored unpublished)');
    ok(sugAdmin.submitterEmail === 'tester@example.com', 'submitter email still stored for admins');
    ok((await get(`/api/landmarks/${sug.id}`)).status === 404, 'new suggestion not visible publicly');

    // Upload key: right landmark only, cap enforced
    const up = (id: number, key: string | undefined, n = 1) =>
        fetch(`${BASE}/api/landmarks/${id}/images`, { method: 'POST', headers: key ? { 'X-Upload-Key': key } : {}, body: form(n) });
    ok((await up(sug.id, undefined)).status === 401, 'suggestion photo upload without key -> 401');
    ok((await up(sug.id, 'garbage.key')).status === 401, 'suggestion photo upload with forged key -> 401');
    ok((await up(Number(tid), sug.uploadKey)).status === 401, "suggestion's key refused on a different landmark -> 401");
    const good = await up(sug.id, sug.uploadKey, 3);
    ok(good.status === 201, 'suggestion photo upload with its key -> 201', String(good.status));
    ok((await up(sug.id, sug.uploadKey, 8)).status === 400, 'more than 10 photos on a suggestion -> 400');
    const after = await (await get(`/api/landmarks/${sug.id}`, admin)).json();
    ok(after.images?.length === 3, `suggestion has exactly the 3 accepted photos (${after.images?.length})`);

    // Uploaded image is served with cross-origin header (feed consumers embed them)
    if (after.images?.[0]) {
        // The path the public feed advertises. The SPA catch-all answers any
        // unknown path with index.html (200), so check it is really an image.
        const img = await get(`/uploads/landmarks/${after.images[0].filename}`);
        ok(img.status === 200 && (img.headers.get('content-type') ?? '').startsWith('image/'), 'uploaded photo is served as an image', `${img.status} ${img.headers.get('content-type')}`);
        ok(img.headers.get('cross-origin-resource-policy') === 'cross-origin', '/uploads sends CORP cross-origin');
    }

    // Once approved, the key stops working
    const appr = await fetch(`${BASE}/api/landmarks/${sug.id}`, { method: 'PUT', headers: { ...json, ...admin }, body: JSON.stringify({ ...sugAdmin, isPublished: true }) });
    ok(appr.status === 200, 'admin approve (PUT) works with password');
    ok((await up(sug.id, sug.uploadKey)).status === 401, 'upload key refused once the landmark is published');

    // Admin can still upload and delete photos
    ok((await fetch(`${BASE}/api/landmarks/${sug.id}/images`, { method: 'POST', headers: admin, body: form() })).status === 201, 'admin photo upload works');

    // Clean up
    const del = await fetch(`${BASE}/api/landmarks/${sug.id}`, { method: 'DELETE', headers: admin });
    ok(del.status === 204, 'admin delete works (test row removed)');

    // Login rate limit (last: it locks this IP out for a minute)
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) {
        const r = await fetch(BASE + '/api/admin/verify-password', { method: 'POST', headers: json, body: JSON.stringify({ password: 'nope' + i }) });
        codes.push(r.status);
    }
    ok(codes.includes(429), 'repeated wrong passwords hit the rate limit (429)', codes.join(','));
}

await live();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
