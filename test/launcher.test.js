import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeCode, isValidHttpsBaseUrl, buildPortalUrl, resolveRestaurant } from '../public/app.js';

test('FoodBliz Kitchen Launcher verification suite', async (t) => {
  const restaurantsJson = JSON.parse(fs.readFileSync(path.resolve('public/restaurants.json'), 'utf8'));
  const appJs = fs.readFileSync(path.resolve('public/app.js'), 'utf8');
  const headersTxt = fs.readFileSync(path.resolve('public/_headers'), 'utf8');

  await t.test('1. restaurants.json includes active SAVERAK22 entry with valid HTTPS URL and portalPath /admin', () => {
    assert.ok(restaurantsJson.SAVERAK22, 'SAVERAK22 entry must exist');
    assert.strictEqual(restaurantsJson.SAVERAK22.active, true);
    assert.strictEqual(isValidHttpsBaseUrl(restaurantsJson.SAVERAK22.baseUrl), true);
    assert.strictEqual(restaurantsJson.SAVERAK22.portalPath, '/admin');
  });

  await t.test('2. normalizeCode handles lowercase, whitespace, and punctuation safely', () => {
    assert.strictEqual(normalizeCode('  saverak22 '), 'SAVERAK22');
    assert.strictEqual(normalizeCode('kitchen-1!@#'), 'KITCHEN-1');
    assert.strictEqual(normalizeCode(''), '');
  });

  await t.test('3. resolveRestaurant matches valid active entries and rejects inactive/HTTP entries', () => {
    const match = resolveRestaurant(restaurantsJson, 'saverak22');
    assert.ok(match, 'match should not be null');
    assert.strictEqual(match.code, 'SAVERAK22');
    assert.strictEqual(buildPortalUrl(match), 'https://saveraparadise.foodbliz.in/admin');

    const badDir = {
      OFF: { name: 'Off', baseUrl: 'https://off.foodbliz.in', portalPath: '/admin', active: false },
      INSECURE: { name: 'Bad', baseUrl: 'http://bad.foodbliz.in', portalPath: '/admin', active: true }
    };
    assert.strictEqual(resolveRestaurant(badDir, 'OFF'), null);
    assert.strictEqual(resolveRestaurant(badDir, 'INSECURE'), null);
  });

  await t.test('4. app.js calls AndroidNative bridge hooks and _headers disables cache on restaurants.json', () => {
    assert.match(appJs, /AndroidNative\.setRestaurantBaseUrl/);
    assert.match(appJs, /AndroidNative\.clearRestaurantBaseUrl/);
    assert.match(headersTxt, /\/restaurants\.json[\s\S]*no-cache/);
  });
});
