import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { safeEqual, isAdminRequest, createUploadKey, verifyUploadKey, toPublicLandmark, UPLOAD_KEY_TTL_MS } from './security.js';

const secret = crypto.randomBytes(32);

test('safeEqual', () => {
    assert.equal(safeEqual('abc', 'abc'), true);
    assert.equal(safeEqual('abc', 'abd'), false);
    assert.equal(safeEqual('abc', 'abcd'), false);
});

test('isAdminRequest', () => {
    assert.equal(isAdminRequest('Bearer pw', 'pw'), true);
    assert.equal(isAdminRequest('Bearer nope', 'pw'), false);
    assert.equal(isAdminRequest('pw', 'pw'), false, 'must use Bearer scheme');
    assert.equal(isAdminRequest(undefined, 'pw'), false);
    assert.equal(isAdminRequest(undefined, undefined), true, 'no password configured = dev mode');
});

test('upload key works for its landmark only, until it expires', () => {
    const now = 1_000_000;
    const key = createUploadKey(42, now, secret);
    assert.equal(verifyUploadKey(key, 42, now + 1000, secret), true);
    assert.equal(verifyUploadKey(key, 43, now + 1000, secret), false, 'other landmark');
    assert.equal(verifyUploadKey(key, 42, now + UPLOAD_KEY_TTL_MS + 1, secret), false, 'expired');
    assert.equal(verifyUploadKey(key, 42, now, crypto.randomBytes(32)), false, 'other server secret');
});

test('upload key cannot be extended by editing its expiry', () => {
    const now = 1_000_000;
    const key = createUploadKey(42, now, secret);
    const [, sig] = key.split('.');
    const forged = `${now + UPLOAD_KEY_TTL_MS * 100}.${sig}`;
    assert.equal(verifyUploadKey(forged, 42, now + UPLOAD_KEY_TTL_MS + 1, secret), false);
});

test('malformed keys are rejected, not thrown', () => {
    for (const k of [undefined, '', '.', 'abc', '123.', 'x.y', '9999999999999.zz']) {
        assert.equal(verifyUploadKey(k, 1, 0, secret), false, String(k));
    }
    assert.equal(verifyUploadKey(createUploadKey(1, 0, secret), NaN, 0, secret), false);
});

test('toPublicLandmark strips every submitter field and keeps the rest', () => {
    const out = toPublicLandmark({ id: 1, name: 'x', submitterName: 'a', submitterEmail: 'b', submitterComment: 'c' });
    assert.deepEqual(out, { id: 1, name: 'x' });
});
