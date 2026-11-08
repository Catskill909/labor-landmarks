/**
 * Link previews for shared landmark links.
 *
 * Facebook, Bluesky, iMessage, Slack and email clients read a page's
 * Open Graph tags without running JavaScript, so the React app can't set them.
 * For `/landmark/:ref` the server swaps the block between the share-meta
 * markers in `index.html` for tags describing that landmark.
 *
 * Landmark text can come from public suggestions, and it goes into the page's
 * <head>. It is all escaped here, in one place. (Same approach as the Labor
 * Database's server/share-meta.ts, 8 Nov 2026.)
 */
import { landmarkPath } from './landmark-link.js';
import { placeName } from './place-name.js';

export const SITE_NAME = 'LHF Labor Landmarks';

export const SHARE_META_START = '<!-- share-meta:start -->';
export const SHARE_META_END = '<!-- share-meta:end -->';

/** Square LHF logo (public/), for landmarks without a photo of their own. */
export const DEFAULT_SHARE_IMAGE = '/laborheritage.png';

const DESCRIPTION_LENGTH = 200;
const TITLE_LENGTH = 100;

export interface ShareMeta {
    title: string;
    description: string;
    /** Absolute URL of this page. Omitted when the site's address is unknown. */
    url?: string;
    /** Absolute URL of a picture. */
    image?: string;
    /** The picture is the site logo, not the landmark's own: show a small card. */
    imageIsDefault?: boolean;
}

export interface ShareableLandmark {
    id: number;
    name: string;
    city: string;
    state: string;
    country: string | null;
    description: string;
    images: { filename: string }[];
}

/** Escape text for an HTML attribute value or element body. */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Collapse whitespace and cut to `max` characters at a word, adding "…". */
export function clip(text: string, max: number): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= max) return flat;
    const cut = flat.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, '')}…`;
}

/** "Name — Chicago, IL" / "Name — Lisbon, Portugal" (see place-name.ts). */
function landmarkTitle(landmark: ShareableLandmark): string {
    const name = clip(landmark.name?.trim() || 'Labor landmark', TITLE_LENGTH);
    const place = placeName(landmark);
    return place ? `${name} — ${place}` : name;
}

/**
 * Preview tags for one landmark. `baseUrl` is the site's public address
 * (PUBLIC_BASE_URL, no trailing slash). Without it there is no way to write the
 * absolute URLs previews need, so the page and picture URLs are left out
 * rather than guessed from request headers, which a client controls.
 */
export function buildLandmarkShareMeta(landmark: ShareableLandmark, baseUrl: string | null): ShareMeta {
    const meta: ShareMeta = {
        title: landmarkTitle(landmark),
        description: clip(landmark.description || landmark.name || '', DESCRIPTION_LENGTH),
    };
    if (baseUrl) {
        meta.url = `${baseUrl}${landmarkPath(landmark)}`;
        const first = landmark.images[0];
        if (first) {
            meta.image = `${baseUrl}/uploads/landmarks/${encodeURIComponent(first.filename)}`;
        } else {
            // 32 of 454 landmarks have no photo (8 Nov 2026). Facebook warns
            // when og:image is missing, so they share with the logo.
            meta.image = `${baseUrl}${DEFAULT_SHARE_IMAGE}`;
            meta.imageIsDefault = true;
        }
    }
    return meta;
}

function renderShareMeta(meta: ShareMeta): string {
    const tag = (attr: 'name' | 'property', key: string, value: string) =>
        `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
    const lines = [
        `<title>${escapeHtml(`${meta.title} | ${SITE_NAME}`)}</title>`,
        tag('name', 'description', meta.description),
        tag('property', 'og:site_name', SITE_NAME),
        tag('property', 'og:type', 'article'),
        tag('property', 'og:title', meta.title),
        tag('property', 'og:description', meta.description),
        // A large card stretches a square logo; keep those small.
        tag('name', 'twitter:card', meta.image && !meta.imageIsDefault ? 'summary_large_image' : 'summary'),
    ];
    if (meta.url) {
        lines.push(tag('property', 'og:url', meta.url));
        lines.push(`<link rel="canonical" href="${escapeHtml(meta.url)}" />`);
    }
    if (meta.image) lines.push(tag('property', 'og:image', meta.image));
    return lines.join('\n    ');
}

/**
 * Replace the share-meta block of `index.html` with tags for `meta`.
 * Throws if the markers are missing: that means `index.html` was edited
 * without them, and silently serving generic previews would hide it.
 */
export function injectShareMeta(html: string, meta: ShareMeta): string {
    const start = html.indexOf(SHARE_META_START);
    const end = html.indexOf(SHARE_META_END);
    if (start === -1 || end === -1 || end < start) {
        throw new Error('index.html is missing the share-meta markers');
    }
    return (
        html.slice(0, start + SHARE_META_START.length) +
        '\n    ' + renderShareMeta(meta) + '\n    ' +
        html.slice(end)
    );
}
