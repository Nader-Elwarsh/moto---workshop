/* اختبارات الخريطة والطريق والعربيات والأسماء */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapToDrivable, ROADS, WORKSHOP, ROAD_HALF, VILLAGES } from './data-world.js';
import { NAMES, fakePhone } from './data-people.js';
import { S, resetState } from './game-state.js';
import { startDay } from './game-day.js';
import { routeOrders } from './game-orders.js';
import { updateBike } from './game-bike.js';
import { cars, spawnTraffic, updateTraffic } from './game-traffic.js';

const onAsphalt = (p) => { const q = snapToDrivable(p.x, p.y); return Math.hypot(q.x - p.x, q.y - p.y) < 0.01; };

test('نقطة على الطريق بترجع زي ما هي، ونقطة في الغيط بتتشد للطريق', () => {
  const mid = ROADS[0][9];
  assert.deepEqual(snapToDrivable(mid.x, mid.y), { x: mid.x, y: mid.y });
  const far = snapToDrivable(5, 5);
  assert.ok(onAsphalt(far));
});

test('الموتوسيكل مايخرجش عن الأسفلت مهما سقت في أي اتجاه', () => {
  resetState(); startDay();
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, input = { x: Math.cos(a), y: Math.sin(a), m: 1 };
    for (let i = 0; i < 300; i++) { updateBike(1 / 30, input); assert.ok(onAsphalt(S.bike), `خرج برا الطريق عند ${S.bike.x},${S.bike.y}`); }
  }
});

test('مكان الركنة لكل أمر على الأسفلت', () => {
  resetState(); startDay();
  for (const o of routeOrders()) assert.ok(onAsphalt(o), `أمر #${o.no} راكن برا الطريق`);
});

test('أسماء العملاء كلمة واحدة، والأرقام وهمية (5-6 أرقام تبدأ بـ 0 ومش 01)', () => {
  for (const n of NAMES) assert.ok(!/\s/.test(n), `"${n}" فيه مسافة`);
  for (let i = 0; i < 500; i++) {
    const p = fakePhone();
    assert.match(p, /^0[3-9]\d{3,4}$/);
  }
});

test('العربيات ماشية وفاضلة على الطريق', () => {
  resetState(); startDay(); S.bike.x = -999; S.bike.y = -999;
  spawnTraffic(10);
  const start = cars.map((c) => [c.x, c.y]);
  for (let i = 0; i < 120; i++) updateTraffic(1 / 30);
  assert.ok(cars.some((c, i) => Math.hypot(c.x - start[i][0], c.y - start[i][1]) > 20), 'مفيش عربية اتحركت');
  for (const c of cars) { const q = snapToDrivable(c.x, c.y); assert.ok(Math.hypot(q.x - c.x, q.y - c.y) < ROAD_HALF, 'عربية برا الطريق'); }
});
