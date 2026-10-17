/* =========================================================
   العربيات على الطريق: ملاكي، ميكروباص، توك توك، جرار.
   كل عربية ماشية على طريق ناحية اليمين، ولما توصل لتقاطع
   بتختار طريق تاني من نفس التقاطع. لو خبطت فيها الموتوسيكل
   بيرتد ويقف.
   ========================================================= */
import { ROADS, ROAD_LEN, ROAD_ENDS, pointOnRoad } from './data-world.js';
import { emit } from './core-events.js';
import { S } from './game-state.js';

export const CAR_TYPES = {
  sedan:   { name: 'ملاكي',   len: 30, wid: 15, speed: [140, 190], colors: ['#d9d9d9', '#2b4c7e', '#8a1c1c', '#1f1f1f', '#e8e2cf'] },
  micro:   { name: 'ميكروباص', len: 40, wid: 17, speed: [120, 160], colors: ['#f2f2ee', '#c9c1a8'] },
  tuktuk:  { name: 'توك توك', len: 20, wid: 12, speed: [70, 100],  colors: ['#c0392b', '#1b6fa8', '#d4a017'] },
  tractor: { name: 'جرار',    len: 28, wid: 16, speed: [45, 65],   colors: ['#2e7d32', '#c62828'] },
};
const MIX = ['sedan', 'sedan', 'sedan', 'micro', 'micro', 'tuktuk', 'tuktuk', 'tuktuk', 'tractor'];
const SIDE = 10;           // بُعد العربية عن نص الطريق (يمين)
const L = (ri) => ROAD_LEN[ri][ROAD_LEN[ri].length - 1];

export const cars = [];

export function spawnTraffic(n = 16, r = Math.random) {
  cars.length = 0;
  for (let i = 0; i < n; i++) {
    const type = MIX[Math.floor(r() * MIX.length)], t = CAR_TYPES[type];
    const ri = Math.floor(r() * ROADS.length);
    cars.push({
      type, ri, s: r() * L(ri), dir: r() < .5 ? 1 : -1,
      v: t.speed[0] + r() * (t.speed[1] - t.speed[0]),
      color: t.colors[Math.floor(r() * t.colors.length)],
      x: 0, y: 0, a: 0, wait: 0,
    });
  }
  for (const c of cars) place(c);
}

function place(c) {
  const p = pointOnRoad(c.ri, c.s);
  const a = c.dir > 0 ? p.a : p.a + Math.PI;
  c.a = a;
  c.x = p.x - Math.sin(a) * SIDE;   // يمين اتجاه السير
  c.y = p.y + Math.cos(a) * SIDE;
}

/* لما العربية توصل لآخر الطريق: تختار طريق تاني من نفس التقاطع */
function turnAtEnd(c) {
  const end = c.dir > 0 ? ROAD_ENDS[c.ri][1] : ROAD_ENDS[c.ri][0];
  const options = [];
  ROAD_ENDS.forEach(([a, b], i) => { if (i !== c.ri && (a === end || b === end)) options.push([i, a === end ? 1 : -1]); });
  if (!options.length) { c.dir *= -1; return; }
  const [ri, dir] = options[Math.floor(Math.random() * options.length)];
  c.ri = ri; c.dir = dir; c.s = dir > 0 ? 0 : L(ri);
  c.wait = .4 + Math.random() * .8;     // وقفة صغيرة عند التقاطع
}

let bumpCooldown = 0;
export function updateTraffic(dt) {
  const b = S.bike;
  bumpCooldown = Math.max(0, bumpCooldown - dt);
  for (const c of cars) {
    if (c.wait > 0) { c.wait -= dt; continue; }
    // بتهدّي لو الموتوسيكل قدامها
    const ahead = Math.hypot(b.x - (c.x + Math.cos(c.a) * 30), b.y - (c.y + Math.sin(c.a) * 30)) < 28;
    const v = ahead ? c.v * .15 : c.v;
    c.s += c.dir * v * dt;
    if (c.s < 0 || c.s > L(c.ri)) turnAtEnd(c);
    place(c);
    // خبطة؟
    const t = CAR_TYPES[c.type];
    if (bumpCooldown <= 0 && Math.hypot(b.x - c.x, b.y - c.y) < t.len / 2 + 9) {
      b.v = -70; bumpCooldown = 1.2;
      if (S.stats) S.stats.bumps = (S.stats.bumps || 0) + 1;
      emit('sound', 'horn');
      emit('toast', { msg: `حاسب! كنت هتخبط في ${t.name}`, kind: 'bad' });
    }
  }
}
