/**
 * Tests for shareable landmark links.
 *
 * The contract: whatever the name, `landmarkPath()` produces a link that
 * `parseLandmarkRef()` reads back to the same id — and only the number decides
 * which landmark opens. Names get edited, so a link with stale words must
 * still find its landmark.
 *
 *   npx tsx --test server/landmark-link.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landmarkPath, parseLandmarkRef, slugify, LANDMARK_PATH_PREFIX } from './landmark-link.js';

test('slugify folds accents, apostrophes, dashes and punctuation into plain words', () => {
    assert.equal(slugify('The Abraham Lincoln Brigade Monument'), 'the-abraham-lincoln-brigade-monument');
    assert.equal(slugify('9to5—YWCA building'), '9to5-ywca-building');
    assert.equal(slugify('1932 Farmers’ Holiday—Squirrel Cage Jail'), '1932-farmers-holiday-squirrel-cage-jail');
    assert.equal(slugify('Café Bürgerhaus'), 'cafe-burgerhaus');
    assert.equal(slugify('10,000 Strikers Memorial'), '10000-strikers-memorial');
});

test('slugify gives an empty string when nothing is left', () => {
    for (const text of ['', '   ', '!!!', '工人', '—']) assert.equal(slugify(text), '', text);
});

test('slugify cuts long names at a word, never mid-word or on a hyphen', () => {
    const long = 'The Lawrence Textile Strike Memorial and Bread and Roses Heritage Trail Visitor Centre';
    const slug = slugify(long);
    assert.ok(slug.length <= 60, slug);
    assert.ok(!slug.endsWith('-'), slug);
    assert.ok(long.toLowerCase().startsWith(slug.replace(/-/g, ' ')), slug);
    assert.equal(slugify('a'.repeat(80)).length, 60);
});

test('every link reads back to its own id, whatever the name', () => {
    const names = ['Haymarket Memorial', '', '工人纪念碑', '123 Main Street', '-', '1-2-3', 'a'.repeat(300), 'Name\nwith\ttabs'];
    for (const [i, name] of names.entries()) {
        const id = i * 1000 + 7;
        const path = landmarkPath({ id, name });
        assert.ok(path.startsWith(LANDMARK_PATH_PREFIX), path);
        assert.match(path, /^\/landmark\/\d+(-[a-z0-9]+(-[a-z0-9]+)*)?$/, path);
        assert.equal(parseLandmarkRef(path.slice(LANDMARK_PATH_PREFIX.length)), id, path);
    }
});

test('a name with digits never changes the id that is read back', () => {
    assert.equal(landmarkPath({ id: 5, name: '1-2-3' }), '/landmark/5-1-2-3');
    assert.equal(parseLandmarkRef('5-1-2-3'), 5);
});

test('stale or missing words still find the landmark', () => {
    for (const ref of ['540', '540-haymarket', '540-old-name-before-edit', '540-', '540-%E5%B7%A5']) {
        assert.equal(parseLandmarkRef(ref), 540, ref);
    }
});

test('anything that is not a leading positive number is rejected', () => {
    for (const ref of [undefined, null, '', 'abc', 'haymarket-540', '540abc', '0', '0-x', '-540', '007', ' 540', '5.4', '99999999999']) {
        assert.equal(parseLandmarkRef(ref), null, String(ref));
    }
});
