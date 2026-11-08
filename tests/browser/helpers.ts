import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

export interface FixtureIds {
    seattle: number;
    triangle: number;
    haymarket: number;
    hostile: number;
    unpublished: number;
    lisbon: number;
}

/** Ids written by fixtures.ts when the test server started. Call inside a test. */
export function fixtures(): FixtureIds {
    return JSON.parse(fs.readFileSync(path.join(here, '.tmp', 'fixtures.json'), 'utf8'));
}

export const SITE_TITLE = 'LHF Labor Landmarks';
export const HOME = /localhost:\d+\/$/;

/** The popup, by landmark name. (Moving between landmarks cross-fades two popups for a moment.) */
export const dialog = (page: Page, name?: string | RegExp) =>
    name ? page.getByRole('dialog', { name }) : page.getByRole('dialog');

export async function showList(page: Page) {
    await page.getByRole('button', { name: 'List', exact: true }).click();
}

/** Distance in pixels from a map pin to the centre of the map. */
export async function pinDistanceFromMapCentre(page: Page, name: string): Promise<number> {
    const map = await page.locator('.leaflet-container').first().boundingBox();
    const pin = await page.getByAltText(name, { exact: true }).boundingBox();
    if (!map || !pin) return Infinity;
    // A Leaflet pin's point is at the bottom centre of its icon.
    const dx = pin.x + pin.width / 2 - (map.x + map.width / 2);
    const dy = pin.y + pin.height - (map.y + map.height / 2);
    return Math.hypot(dx, dy);
}
