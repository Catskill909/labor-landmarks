/**
 * Shareable landmark links (8 Nov 2026): /landmark/<id>-<name>, Copy link,
 * Back/close, Previous/Next, the map flying to a shared landmark, failed
 * links, server previews, and the public feed's photo URLs.
 */
import { test, expect } from '@playwright/test';
import { fixtures, dialog, HOME, SITE_TITLE, showList, pinDistanceFromMapCentre } from './helpers';

test('opening a landmark from the list gives it its own address; Copy link copies it', async ({ page }) => {
    await page.goto('/');
    await showList(page);
    await page.getByRole('button', { name: 'Read more: Triangle Shirtwaist Factory' }).click();

    await expect(page).toHaveURL(/\/landmark\/\d+-triangle-shirtwaist-factory$/);
    await expect(dialog(page, 'Triangle Shirtwaist Factory')).toBeVisible();
    await expect(page).toHaveTitle(`Triangle Shirtwaist Factory | ${SITE_TITLE}`);

    await dialog(page).getByRole('button', { name: 'Copy link to this landmark' }).click();
    await expect(dialog(page).getByRole('button', { name: 'Link copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
});

test('opening a landmark from its map pin sets the address; Back closes it without reloading', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { (window as unknown as { sameDocument: boolean }).sameDocument = true; });
    await page.getByAltText('Haymarket Martyrs Monument', { exact: true }).click();
    await page.getByText('VIEW DETAILS').click();

    await expect(page).toHaveURL(/\/landmark\/\d+-haymarket-martyrs-monument$/);
    await expect(dialog(page, 'Haymarket Martyrs Monument')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(HOME);
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveTitle(SITE_TITLE);
    expect(await page.evaluate(() => (window as unknown as { sameDocument?: boolean }).sameDocument)).toBe(true);
});

test('Previous/Next change the address in place, so Back returns to the list', async ({ page }) => {
    await page.goto('/');
    await showList(page);
    await page.getByRole('button', { name: 'Read more: Triangle Shirtwaist Factory' }).click();
    const first = page.url();

    await page.getByRole('button', { name: 'Next landmark' }).click();
    await expect(page).not.toHaveURL(first);
    await expect(page).toHaveURL(/\/landmark\/\d+-[a-z0-9-]+$/);
    await page.keyboard.press('ArrowRight'); // keyboard too
    await page.getByRole('button', { name: 'Previous landmark' }).click();

    await page.goBack();
    await expect(page).toHaveURL(HOME);
    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Read more: Triangle Shirtwaist Factory' })).toBeVisible();
});

test('a shared link opens the landmark; Escape closes it and the map flies to the landmark', async ({ page }) => {
    const { seattle } = fixtures();
    await page.goto(`/landmark/${seattle}`);
    await expect(page).toHaveURL(new RegExp(`/landmark/${seattle}-seattle-general-strike-site$`));
    await expect(dialog(page, 'Seattle General Strike Site')).toBeVisible();

    await page.keyboard.press('Escape'); // map view: Escape used to do nothing here
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(HOME);
    await expect.poll(() => pinDistanceFromMapCentre(page, 'Seattle General Strike Site'), { timeout: 8_000 })
        .toBeLessThan(60);
});

for (const [label, ref] of [
    ['an unknown landmark', () => '999999-nothing-here'],
    ['an unpublished landmark', () => String(fixtures().unpublished)],
    ['a malformed link', () => 'abc'],
] as const) {
    test(`${label} lands on the map with a notice`, async ({ page }) => {
        const response = await page.goto(`/landmark/${ref()}`);
        expect(response?.status()).toBe(404);
        await expect(page.getByRole('status')).toContainText("That landmark isn't available");
        await expect(page).toHaveURL(HOME);
        await expect(dialog(page)).toBeHidden();
    });
}

test('server: stale or missing words redirect (301) to the current address, keeping the query', async ({ request }) => {
    const { haymarket } = fixtures();
    for (const ref of [`${haymarket}`, `${haymarket}-an-old-name`]) {
        const res = await request.get(`/landmark/${ref}?utm_source=news`, { maxRedirects: 0 });
        expect(res.status()).toBe(301);
        expect(res.headers()['location']).toBe(`/landmark/${haymarket}-haymarket-martyrs-monument?utm_source=news`);
    }
});

test('server: previews carry "Name — City, State", the page address, and the photo or the logo', async ({ request }) => {
    const { triangle, haymarket } = fixtures();
    const withPhoto = await (await request.get(`/landmark/${triangle}-triangle-shirtwaist-factory`)).text();
    expect(withPhoto).toContain('<meta property="og:title" content="Triangle Shirtwaist Factory — New York, NY" />');
    expect(withPhoto).toContain(`<meta property="og:url" content="http://localhost:3102/landmark/${triangle}-triangle-shirtwaist-factory" />`);
    expect(withPhoto).toContain('<meta property="og:image" content="http://localhost:3102/uploads/landmarks/fixture-triangle.jpg" />');
    expect(withPhoto).toContain('<meta name="twitter:card" content="summary_large_image" />');

    const noPhoto = await (await request.get(`/landmark/${haymarket}-haymarket-martyrs-monument`)).text();
    expect(noPhoto).toContain('<meta property="og:image" content="http://localhost:3102/laborheritage.png" />');
    expect(noPhoto).toContain('<meta name="twitter:card" content="summary" />');

    const logo = await request.get('/laborheritage.png');
    expect(logo.headers()['content-type']).toBe('image/png');
});

test('a placeholder state ("NA") never shows: preview, popup and list read "Lisbon, Portugal"', async ({ page, request }) => {
    const { lisbon } = fixtures();
    const html = await (await request.get(`/landmark/${lisbon}`)).text();
    expect(html).toContain('<meta property="og:title" content="Tejo Power Station — Lisbon, Portugal" />');

    await page.goto(`/landmark/${lisbon}`);
    await expect(dialog(page, 'Tejo Power Station')).toContainText('Lisbon, Portugal');
    await expect(dialog(page)).not.toContainText('NA,');
    await page.keyboard.press('Escape');
    await showList(page);
    await expect(page.getByText('Lisbon, Portugal', { exact: true })).toBeVisible();
});

test('a name containing HTML/script stays text — in the preview and on the page', async ({ page, request }) => {
    const { hostile } = fixtures();
    const html = await (await request.get(`/landmark/${hostile}`)).text();
    expect(html).not.toContain('<script>window.__pwned');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;window.__pwned=1&lt;/script&gt;');

    await page.goto(`/landmark/${hostile}`);
    await expect(dialog(page)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('the public feed builds photo URLs from the configured address, not the request header', async ({ request }) => {
    const res = await request.get('/api/landmarks', { headers: { 'X-Forwarded-Host': 'evil.example' } });
    const landmarks = await res.json() as { images: { url: string }[] }[];
    const urls = landmarks.flatMap(l => l.images.map(i => i.url));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url.startsWith('http://localhost:3102/uploads/landmarks/')).toBe(true);
});

test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });

    test('popup fits the screen and the icon-only Copy link still has a name', async ({ page }) => {
        const { triangle } = fixtures();
        await page.goto(`/landmark/${triangle}`);
        await expect(dialog(page)).toBeVisible();
        await expect(dialog(page).getByRole('button', { name: 'Copy link to this landmark' })).toBeVisible();
        await expect(dialog(page).getByRole('button', { name: 'Close' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
});
