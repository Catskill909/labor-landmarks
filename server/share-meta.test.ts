/**
 * Tests for link previews on shared landmark pages.
 *
 * Landmark text can come from public suggestions and goes into the page's
 * <head>. The class of bug to prevent is any of it escaping into markup — so
 * every text field gets every hostile string, and the output is checked
 * structurally: the block holds only the tags we write, and each value reads
 * back exactly as the landmark had it.
 *
 *   npx tsx --test server/share-meta.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildLandmarkShareMeta, injectShareMeta, escapeHtml, clip,
    SHARE_META_START, SHARE_META_END, DEFAULT_SHARE_IMAGE, type ShareableLandmark,
} from './share-meta.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = fs.readFileSync(path.join(here, '../index.html'), 'utf8');
const BASE = 'https://labor-landmarks.example.org';

const HOSTILE = [
    '"><script>alert(1)</script>',
    "' onmouseover='alert(1)",
    '</title><script>alert(1)</script>',
    '<!-- share-meta:end --><script>x</script>',
    '&lt;already escaped&gt; & raw &',
    'line\nbreak\ttab',
    '<img src=x onerror=alert(1)>',
];

function landmark(over: Partial<ShareableLandmark> = {}): ShareableLandmark {
    return {
        id: 540, name: 'The Abraham Lincoln Brigade Monument', city: 'San Francisco', state: 'CA',
        country: 'USA', description: 'Honors Americans who fought fascism in Spain.',
        images: [{ filename: 'brigade.jpg' }], ...over,
    };
}

function unescapeHtml(text: string): string {
    return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function block(html: string): string {
    const start = html.indexOf(SHARE_META_START) + SHARE_META_START.length;
    return html.slice(start, html.indexOf(SHARE_META_END, start));
}

test('index.html carries the share-meta markers, in order', () => {
    const start = INDEX_HTML.indexOf(SHARE_META_START);
    const end = INDEX_HTML.indexOf(SHARE_META_END);
    assert.ok(start !== -1 && end > start);
    assert.equal(INDEX_HTML.split(SHARE_META_START).length, 2, 'exactly one start marker');
});

test('hostile text in any field cannot add markup to the page', () => {
    for (const bad of HOSTILE) {
        for (const field of ['name', 'city', 'state', 'country', 'description'] as const) {
            for (const images of [[], [{ filename: 'p.jpg' }]]) {
                const html = injectShareMeta(INDEX_HTML, buildLandmarkShareMeta(landmark({ [field]: bad, images }), BASE));
                const b = block(html);
                const tags = b.match(/<[^>]*>/g) ?? [];
                for (const t of tags) assert.match(t, /^<(\/?title|meta |link )/, `${field}: ${t}`);
                assert.equal(b.split('<').length - 1, tags.length, `${field}: stray '<'`);
                assert.ok(!b.includes('<script'), field);
                assert.equal(html.split(SHARE_META_END).length, 2, `${field}: end marker`);
                assert.equal(html.split('</head>').length, 2);
            }
        }
    }
});

test('values read back exactly as the landmark had them', () => {
    const tricky = 'Bread & Roses: "Lawrence" — it\'s <ours>';
    const b = block(injectShareMeta(INDEX_HTML, buildLandmarkShareMeta(landmark({ name: tricky, city: '', state: '', country: null }), BASE)));
    const og = /property="og:title" content="([^"]*)"/.exec(b);
    assert.ok(og);
    assert.equal(unescapeHtml(og[1]), tricky);
});

test('title is "Name — City, State", or the country outside the US', () => {
    assert.equal(buildLandmarkShareMeta(landmark(), BASE).title, 'The Abraham Lincoln Brigade Monument — San Francisco, CA');
    assert.equal(buildLandmarkShareMeta(landmark({ state: '', city: 'Dublin', country: 'Ireland' }), BASE).title,
        'The Abraham Lincoln Brigade Monument — Dublin, Ireland');
    assert.equal(buildLandmarkShareMeta(landmark({ city: '', state: '', country: null }), BASE).title,
        'The Abraham Lincoln Brigade Monument');
});

test('every landmark has og:image: its first photo (large card) or the logo (small card)', () => {
    const withPhoto = block(injectShareMeta(INDEX_HTML, buildLandmarkShareMeta(landmark(), BASE)));
    assert.match(withPhoto, /og:image" content="https:\/\/labor-landmarks\.example\.org\/uploads\/landmarks\/brigade\.jpg"/);
    assert.match(withPhoto, /twitter:card" content="summary_large_image"/);

    const noPhoto = block(injectShareMeta(INDEX_HTML, buildLandmarkShareMeta(landmark({ images: [] }), BASE)));
    assert.match(noPhoto, /og:image" content="https:\/\/labor-landmarks\.example\.org\/laborheritage\.png"/);
    assert.match(noPhoto, /twitter:card" content="summary"/);
});

test('the default picture exists in public/', () => {
    assert.ok(fs.existsSync(path.join(here, '../public', DEFAULT_SHARE_IMAGE)));
});

test('picture and page URL use the configured address, never a guess', () => {
    const withBase = buildLandmarkShareMeta(landmark(), BASE);
    assert.equal(withBase.url, `${BASE}/landmark/540-the-abraham-lincoln-brigade-monument`);
    const noBase = buildLandmarkShareMeta(landmark(), null);
    assert.equal(noBase.url, undefined);
    assert.equal(noBase.image, undefined);
    const b = block(injectShareMeta(INDEX_HTML, noBase));
    assert.ok(!b.includes('og:url') && !b.includes('og:image') && !b.includes('canonical'));
});

test('an odd photo filename cannot break out of the URL', () => {
    const meta = buildLandmarkShareMeta(landmark({ images: [{ filename: 'a" onerror="x.jpg' }] }), BASE);
    assert.ok(!meta.image!.includes('"'));
});

test('long descriptions are cut at a word with an ellipsis', () => {
    const out = clip('word '.repeat(100), 200);
    assert.ok(out.length <= 200);
    assert.ok(out.endsWith('…'));
    assert.equal(clip('short\n\ntext', 200), 'short text');
});

test('injectShareMeta refuses a page without markers', () => {
    assert.throws(() => injectShareMeta('<html><head><title>x</title></head></html>', buildLandmarkShareMeta(landmark(), BASE)));
});

test('escapeHtml covers all five special characters', () => {
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});
