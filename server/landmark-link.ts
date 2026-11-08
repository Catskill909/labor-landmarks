/**
 * Shareable landmark links: `/landmark/540-the-abraham-lincoln-brigade-monument`.
 *
 * The number finds the landmark; the words after it are only for people
 * reading the link. Names can be edited, so the words are never used to look
 * anything up — a link with stale or missing words still opens the right
 * landmark, and the server redirects it to the current form.
 *
 * Pure functions, no Node or DOM APIs: the browser app imports this file too,
 * so the links it copies and the links the server accepts cannot drift apart.
 * (Same rules as the Labor Database's server/entry-link.ts, 8 Nov 2026.)
 */

export const LANDMARK_PATH_PREFIX = '/landmark/';

/** Longest name part of a link, in characters. Cut at a word boundary. */
const MAX_SLUG_LENGTH = 60;

/** Largest id accepted. SQLite INTEGER ids here are far below this. */
const MAX_LANDMARK_ID = 2_147_483_647;

export interface LinkableLandmark {
    id: number;
    name: string;
}

/**
 * Lowercase ASCII words joined by hyphens. Accents are folded ("Bürgerhaus" →
 * "burgerhaus"), apostrophes dropped ("Farmers’" → "farmers"), numbers keep
 * their digits ("10,000" → "10000"), and everything else that is not a letter
 * or digit becomes a word break ("9to5—YWCA" → "9to5-ywca"). Text with no
 * Latin letters or digits gives an empty string; the link is then just the number.
 */
export function slugify(text: string, maxLength = MAX_SLUG_LENGTH): string {
    const slug = text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’‘`]/g, '')
        .replace(/(\d)[,.](?=\d)/g, '$1')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (slug.length <= maxLength) return slug;
    const cut = slug.slice(0, maxLength + 1);
    const lastBreak = cut.lastIndexOf('-');
    // One very long word with no break: hard cut rather than return nothing.
    return (lastBreak > 0 ? cut.slice(0, lastBreak) : slug.slice(0, maxLength)).replace(/-+$/, '');
}

/** The canonical path for a landmark, e.g. `/landmark/540-the-abraham-lincoln-brigade-monument`. */
export function landmarkPath(landmark: LinkableLandmark): string {
    const slug = slugify(landmark.name?.trim() ?? '');
    return `${LANDMARK_PATH_PREFIX}${landmark.id}${slug ? `-${slug}` : ''}`;
}

/**
 * The landmark id from the `:ref` part of `/landmark/:ref`, or null when it is
 * not a valid reference. Only the leading number counts; whatever follows a
 * hyphen is ignored. "540abc", "0", "-5" and "" are not references.
 */
export function parseLandmarkRef(ref: string | undefined | null): number | null {
    if (!ref) return null;
    const match = /^([1-9]\d{0,9})(?:-.*)?$/s.exec(ref);
    if (!match) return null;
    const id = Number(match[1]);
    return id <= MAX_LANDMARK_ID ? id : null;
}
