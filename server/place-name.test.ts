/**
 * Tests for how a landmark's location reads. The cases are the actual kinds of
 * value in the live data (8 Nov 2026): placeholders ("NA", "-", blank),
 * all-capitals names, codes, and the US spelled several ways.
 *
 *   npx tsx --test server/place-name.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeName, fullPlaceName, tidyPlacePart, isUnitedStates } from './place-name.js';

test('placeholders are dropped', () => {
    for (const v of ['NA', 'N/A', 'n/a', '-', '--', '—', '', '   ', null, undefined, 'None', 'unknown']) {
        assert.equal(tidyPlacePart(v), '', String(v));
    }
});

test('all-capitals names read normally; short codes stay', () => {
    assert.equal(tidyPlacePart('ALABAMA'), 'Alabama');
    assert.equal(tidyPlacePart('NEW BRUNSWICK'), 'New Brunswick');
    assert.equal(tidyPlacePart('PENNSYLVANIA'), 'Pennsylvania');
    for (const code of ['NY', 'CA', 'NSW', 'DC']) assert.equal(tidyPlacePart(code), code);
    assert.equal(tidyPlacePart('New York'), 'New York');
    assert.equal(tidyPlacePart('  Rhode   Island '), 'Rhode Island');
});

test('every spelling of the US counts as the US', () => {
    for (const v of ['USA', 'usa', 'US', 'U.S.A.', 'United States', 'united states of america']) assert.ok(isUnitedStates(v), v);
    for (const v of ['Canada', 'Portugal', 'Australia', '', null]) assert.ok(!isUnitedStates(v), String(v));
});

test('placeName: city, state, and the country outside the US', () => {
    assert.equal(placeName({ city: 'Lisbon', state: 'NA', country: 'Portugal' }), 'Lisbon, Portugal');
    assert.equal(placeName({ city: 'Chicago', state: 'IL', country: 'USA' }), 'Chicago, IL');
    assert.equal(placeName({ city: 'Albany', state: 'NY', country: 'United States' }), 'Albany, NY');
    assert.equal(placeName({ city: 'Trinidad', state: '-', country: 'USA' }), 'Trinidad');
    assert.equal(placeName({ city: 'Toronto', state: 'Ontario', country: 'Canada' }), 'Toronto, Ontario, Canada');
    assert.equal(placeName({ city: 'Moncton', state: 'NEW BRUNSWICK', country: 'Canada' }), 'Moncton, New Brunswick, Canada');
    assert.equal(placeName({ city: 'Amsterdam', state: '', country: 'Netherlands' }), 'Amsterdam, Netherlands');
    assert.equal(placeName({ city: '', state: '', country: 'usa' }), '');
});

test('fullPlaceName keeps the US', () => {
    assert.equal(fullPlaceName({ city: 'Chicago', state: 'IL', country: 'USA' }), 'Chicago, IL, USA');
    assert.equal(fullPlaceName({ city: 'Lisbon', state: 'NA', country: 'Portugal' }), 'Lisbon, Portugal');
    assert.equal(fullPlaceName({ city: 'Birmingham', state: 'ALABAMA', country: 'USA' }), 'Birmingham, Alabama, USA');
});
