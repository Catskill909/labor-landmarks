/**
 * How a landmark's location reads: "Chicago, IL", "Lisbon, Portugal",
 * "Toronto, Ontario, Canada".
 *
 * The state and country fields are free text and inconsistent (live data,
 * 8 Nov 2026): 2-letter codes and full names, all-capitals ("ALABAMA",
 * "NEW BRUNSWICK"), placeholders ("NA", "-", blank — "Lisbon, NA" in a link
 * preview), and the US written "USA", "United States" or "usa". Every public
 * place that shows a location goes through here, so they all read the same.
 * The stored data is not changed.
 *
 * Pure functions: the browser app imports this file too.
 */

export interface Place {
    city?: string | null;
    state?: string | null;
    country?: string | null;
}

/** Placeholder values that mean "no value". */
const PLACEHOLDER = /^(n\/?a|none|unknown|null|-+|—|–|\.)$/i;

const UNITED_STATES = /^(u\.?s\.?a?\.?|united states( of america)?|america)$/i;

/**
 * One part of a place, tidied: trimmed, placeholders dropped, and words
 * written in all capitals shown normally ("NEW BRUNSWICK" → "New Brunswick").
 * Short all-capital codes (NY, NSW, DC) are left as they are.
 */
export function tidyPlacePart(text: string | null | undefined): string {
    const t = (text ?? '').replace(/\s+/g, ' ').trim();
    if (!t || PLACEHOLDER.test(t)) return '';
    if (t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
        return t.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g, (_m, sep: string, c: string) => sep + c.toUpperCase());
    }
    return t;
}

export function isUnitedStates(country: string | null | undefined): boolean {
    return UNITED_STATES.test((country ?? '').trim());
}

/**
 * City, state, and the country outside the US:
 * "Chicago, IL" · "Lisbon, Portugal" · "Toronto, Ontario, Canada".
 */
export function placeName(place: Place): string {
    const country = tidyPlacePart(place.country);
    return [
        tidyPlacePart(place.city),
        tidyPlacePart(place.state),
        country && !isUnitedStates(country) ? country : '',
    ].filter(Boolean).join(', ');
}

/** City, state and country, the US included: "Chicago, IL, USA". */
export function fullPlaceName(place: Place): string {
    return [tidyPlacePart(place.city), tidyPlacePart(place.state), tidyPlacePart(place.country)]
        .filter(Boolean).join(', ');
}
