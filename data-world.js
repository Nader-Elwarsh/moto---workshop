/* =========================================================
   الخريطة: القرى، الطرق، الترعة، الغيطان. بتتولد من بذرة ثابتة
   فبتطلع نفس الخريطة كل مرة. لإضافة قرية: زوّدها في VILLAGES
   واربطها بطريق في EDGES.
   ========================================================= */
import { seeded } from './core-util.js';

export const WORLD = { w: 2600, h: 2200 };
const rng = seeded(20261017);

export const WORKSHOP = { x: 1300, y: 1100, name: 'الورشة' };
export const GAS = { x: 0, y: 0, name: 'البنزينة' };

export const VILLAGES = [
  { name: 'الباجور', x: 560, y: 420 }, { name: 'ميت خلف', x: 1340, y: 330 }, { name: 'كفر الحمام', x: 2110, y: 470 },
  { name: 'البتانون', x: 2250, y: 1250 }, { name: 'الراهب', x: 1920, y: 1860 }, { name: 'شبرا بخوم', x: 1180, y: 1880 },
  { name: 'سرس الليان', x: 430, y: 1680 }, { name: 'تلا', x: 380, y: 1050 },
];

// 'W' = الورشة، والأرقام = ترتيب القرية في VILLAGES
const EDGES = [['W', 1], ['W', 7], ['W', 3], ['W', 5], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]];
const node = (k) => (k === 'W' ? WORKSHOP : VILLAGES[k]);
// أطراف كل طريق (عشان العربيات تعرف تلف على أنهي طريق عند التقاطع)
export const ROAD_ENDS = EDGES.map(([a, b]) => [String(a), String(b)]);

/* كل طريق منحنى بيتحول لنقط، فالرسم والفيزيا بيستخدموا نفس الشكل */
export const ROADS = EDGES.map(([a, b]) => {
  const A = node(a), B = node(b);
  const M = { x: (A.x + B.x) / 2 + (rng() - .5) * 220, y: (A.y + B.y) / 2 + (rng() - .5) * 220 };
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18, u = 1 - t;
    pts.push({ x: u * u * A.x + 2 * u * t * M.x + t * t * B.x, y: u * u * A.y + 2 * u * t * M.y + t * t * B.y });
  }
  return pts;
});

export const CANAL = [{ x: -40, y: 760 }, { x: 600, y: 860 }, { x: 1050, y: 760 }, { x: 1600, y: 840 }, { x: 2100, y: 760 }, { x: 2640, y: 880 }];

export const FIELDS = Array.from({ length: 110 }, () => ({
  x: rng() * WORLD.w - 60, y: rng() * WORLD.h - 60, w: 120 + rng() * 220, h: 90 + rng() * 180,
  c: 1 + Math.floor(rng() * 3), r: (rng() - .5) * .5,
}));

export const TREES = Array.from({ length: 260 }, () => ({ x: rng() * WORLD.w, y: rng() * WORLD.h, r: 7 + rng() * 9 }));

for (const v of VILLAGES) {
  v.houses = [];
  for (let tries = 0; v.houses.length < 14 && tries < 400; tries++) {
    const a = rng() * Math.PI * 2, d = 48 + rng() * 120;
    const h = { x: v.x + Math.cos(a) * d, y: v.y + Math.sin(a) * d, w: 22 + rng() * 16, h: 20 + rng() * 14 };
    if (v.houses.every((o) => Math.hypot(o.x - h.x, o.y - h.y) > 40)) v.houses.push(h);
  }
}

/* ---------- هندسة ---------- */
export function segDist(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  let t = l ? ((px - a.x) * dx + (py - a.y) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a.x - t * dx, py - a.y - t * dy);
}
export function polyDist(px, py, pts) {
  let m = Infinity;
  for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, segDist(px, py, pts[i], pts[i + 1]));
  return m;
}
export function onRoad(x, y) {
  for (const r of ROADS) if (polyDist(x, y, r) < 24) return true;
  return Math.hypot(x - WORKSHOP.x, y - WORKSHOP.y) < 70 || Math.hypot(x - GAS.x, y - GAS.y) < 50
    || VILLAGES.some((v) => Math.hypot(x - v.x, y - v.y) < 55);
}
export const inWater = (x, y) => polyDist(x, y, CANAL) < 30;
export const surfaceAt = (x, y) => (onRoad(x, y) ? 'road' : inWater(x, y) ? 'water' : 'field');

// البنزينة على طريق الورشة ← البتانون، على بعد ~480 بكسل من الورشة
{
  let best = ROADS[2][0], bd = Infinity;
  for (const p of ROADS[2]) { const d = Math.abs(Math.hypot(p.x - WORKSHOP.x, p.y - WORKSHOP.y) - 480); if (d < bd) { bd = d; best = p; } }
  GAS.x = best.x; GAS.y = best.y + 48;
}

/* ---------- حدود السواقة ----------
   الموتوسيكل ما يخرجش عن الأسفلت: الطرق + ميادين القرى + الورشة + البنزينة */
export const ROAD_HALF = 20;
export const PLAZAS = () => [
  { x: WORKSHOP.x, y: WORKSHOP.y, r: 70 }, { x: GAS.x, y: GAS.y, r: 50 },
  ...VILLAGES.map((v) => ({ x: v.x, y: v.y, r: 55 })),
];

/* أقرب نقطة مسموح السواقة فيها لأي نقطة (لو النقطة نفسها مسموحة بترجعها زي ما هي) */
export function snapToDrivable(x, y) {
  let best = null, bd = Infinity;
  const consider = (px, py) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py }; } };
  for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) {
    const a = r[i], b = r[i + 1], dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, l ? ((x - a.x) * dx + (y - a.y) * dy) / l : 0));
    const cx = a.x + t * dx, cy = a.y + t * dy, d = Math.hypot(x - cx, y - cy);
    const k = d > ROAD_HALF ? ROAD_HALF / d : 1;
    consider(cx + (x - cx) * k, cy + (y - cy) * k);
    if (bd === 0) return best;
  }
  for (const p of PLAZAS()) {
    const d = Math.hypot(x - p.x, y - p.y), k = d > p.r ? p.r / d : 1;
    consider(p.x + (x - p.x) * k, p.y + (y - p.y) * k);
    if (bd === 0) return best;
  }
  return best;
}

/* طول كل طريق (للعربيات اللي ماشية عليه) */
export const ROAD_LEN = ROADS.map((r) => { const acc = [0]; for (let i = 1; i < r.length; i++) acc.push(acc[i - 1] + Math.hypot(r[i].x - r[i - 1].x, r[i].y - r[i - 1].y)); return acc; });

/* مكان واتجاه على طريق عند مسافة s من أوله */
export function pointOnRoad(ri, s) {
  const r = ROADS[ri], acc = ROAD_LEN[ri], L = acc[acc.length - 1];
  s = Math.max(0, Math.min(L, s));
  let i = 1; while (i < acc.length - 1 && acc[i] < s) i++;
  const a = r[i - 1], b = r[i], t = (s - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, a: Math.atan2(b.y - a.y, b.x - a.x) };
}
