/* رسم الخريطة على الـ canvas: الأرض، الطرق، القرى، الدبابيس، الموتوسيكل،
   الخريطة المصغرة، سهم الـ GPS، وعصا التحكم. الألوان من متغيرات CSS
   (--m-*) فبتتغير تلقائيًا بين النهار والليل. */
import { WORLD, WORKSHOP, GAS, VILLAGES, ROADS, CANAL, FIELDS, TREES, onRoad, inWater } from './data-world.js';
import { S, byNo } from './game-state.js';
import { isActive, routeOrders } from './game-orders.js';
import { cars, CAR_TYPES } from './game-traffic.js';
import { joy } from './core-input.js';

const C = {};
let cv, ctx, vw = 0, vh = 0, dpr = 1, zoom = 1;
const cam = { x: 0, y: 0 };

export function initMap(canvas) {
  cv = canvas; ctx = cv.getContext('2d');
  readColors(); resize();
  addEventListener('resize', resize);
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener ? mq.addEventListener('change', readColors) : mq.addListener(readColors);
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['grass', 'field1', 'field2', 'field3', 'road', 'roadline', 'water', 'bank', 'house', 'roof', 'tree', 'label', 'labelbg', 'shade', 'light'])
    C[k] = cs.getPropertyValue('--m-' + k).trim();
  for (const k of ['navy', 'amber', 'good', 'bad', 'frozen', 'ink', 'surface', 'muted']) C[k] = cs.getPropertyValue('--' + k).trim();
  C.night = C.shade !== '#00000000';
}
function resize() { dpr = Math.min(2, devicePixelRatio || 1); vw = innerWidth; vh = innerHeight; cv.width = vw * dpr; cv.height = vh * dpr; zoom = vw < 600 ? .85 : 1; }
export function snapCamera() { cam.x = S.bike.x; cam.y = S.bike.y; }

export function targetPos() {
  const t = S.target; if (!t) return null;
  if (t.k === 'ws') return WORKSHOP;
  if (t.k === 'gas') return GAS;
  const o = byNo(t.no);
  if (!o || !isActive(o)) { S.target = null; return null; }
  return o;
}

/* ---------- helpers ---------- */
function path(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); }
function pill(x, y, text, bg, fg, size = 13) {
  ctx.font = `700 ${size}px "Readex Pro",Tahoma,sans-serif`;
  const w = ctx.measureText(text).width + 16, h = size + 10;
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}
const treeHidden = new Map();
function hiddenTree(t) {
  if (!treeHidden.has(t)) treeHidden.set(t, onRoad(t.x, t.y) || inWater(t.x, t.y) || VILLAGES.some((v) => Math.hypot(t.x - v.x, t.y - v.y) < 190) || Math.hypot(t.x - WORKSHOP.x, t.y - WORKSHOP.y) < 130);
  return treeHidden.get(t);
}

/* ---------- frame ---------- */
export function drawFrame(now, dt, { hudH, topReserve }) {
  const b = S.bike;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.grass; ctx.fillRect(0, 0, vw, vh);

  cam.x += (b.x + Math.cos(b.a) * b.v * .35 - cam.x) * .12;
  cam.y += (b.y + Math.sin(b.a) * b.v * .35 - cam.y) * .12;
  const cx = vw / 2, cy = hudH + (vh - hudH) / 2 - 30;
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (cx - cam.x * zoom), dpr * (cy - cam.y * zoom));

  drawGround();
  drawPins(now);
  drawCars();
  drawBike(b);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toScreen = (p) => ({ x: cx + (p.x - cam.x) * zoom, y: cy + (p.y - cam.y) * zoom });
  if (C.night) {
    const s = toScreen(b), g = ctx.createRadialGradient(s.x, s.y, 30, s.x, s.y, Math.max(vw, vh) * .7);
    g.addColorStop(0, '#00000000'); g.addColorStop(1, C.shade); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  }
  const miniH = Math.min(150, vw * .32) * WORLD.h / WORLD.w;
  drawGps(now, toScreen, hudH + topReserve + miniH + 40);
  drawMini(hudH + topReserve + 12);
  drawJoy();
}

function drawGround() {
  for (const f of FIELDS) {
    ctx.save(); ctx.translate(f.x + f.w / 2, f.y + f.h / 2); ctx.rotate(f.r);
    ctx.fillStyle = C['field' + f.c]; ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
    ctx.strokeStyle = C.grass; ctx.lineWidth = 2;
    for (let i = -f.w / 2 + 12; i < f.w / 2; i += 14) { ctx.beginPath(); ctx.moveTo(i, -f.h / 2 + 4); ctx.lineTo(i, f.h / 2 - 4); ctx.stroke(); }
    ctx.restore();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  path(CANAL); ctx.strokeStyle = C.bank; ctx.lineWidth = 74; ctx.stroke();
  path(CANAL); ctx.strokeStyle = C.water; ctx.lineWidth = 54; ctx.stroke();
  for (const r of ROADS) { path(r); ctx.strokeStyle = C.night ? '#00000055' : '#00000022'; ctx.lineWidth = 46; ctx.stroke(); }
  for (const r of ROADS) { path(r); ctx.strokeStyle = C.road; ctx.lineWidth = 40; ctx.stroke(); }
  ctx.setLineDash([18, 16]); for (const r of ROADS) { path(r); ctx.strokeStyle = C.roadline; ctx.lineWidth = 3; ctx.stroke(); } ctx.setLineDash([]);
  for (const v of VILLAGES) { ctx.fillStyle = C.road; ctx.beginPath(); ctx.arc(v.x, v.y, 52, 0, 7); ctx.fill(); }
  for (const t of TREES) { if (hiddenTree(t)) continue; ctx.fillStyle = C.tree; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill(); }
  for (const v of VILLAGES) for (const h of v.houses) {
    ctx.fillStyle = '#00000026'; ctx.fillRect(h.x - h.w / 2 + 4, h.y - h.h / 2 + 4, h.w, h.h);
    ctx.fillStyle = C.house; ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h);
    ctx.fillStyle = C.roof; ctx.fillRect(h.x - h.w / 2, h.y - h.h / 2, h.w, 6);
  }
  const W = WORKSHOP;
  ctx.fillStyle = C.road; ctx.beginPath(); ctx.arc(W.x, W.y, 70, 0, 7); ctx.fill();
  ctx.fillStyle = '#00000030'; ctx.fillRect(W.x - 56, W.y - 82, 112, 62);
  ctx.fillStyle = C.navy; ctx.fillRect(W.x - 60, W.y - 86, 112, 62);
  ctx.fillStyle = C.amber; for (let i = 0; i < 7; i++) ctx.fillRect(W.x - 60 + i * 16, W.y - 34, 8, 10);
  pill(W.x - 4, W.y - 104, 'الورشة', C.amber, '#1c1404', 15);
  ctx.fillStyle = '#00000030'; ctx.fillRect(GAS.x - 30, GAS.y - 26, 64, 40);
  ctx.fillStyle = C.bad; ctx.fillRect(GAS.x - 34, GAS.y - 30, 64, 40);
  ctx.fillStyle = C.surface; ctx.fillRect(GAS.x - 24, GAS.y - 20, 10, 20); ctx.fillRect(GAS.x + 4, GAS.y - 20, 10, 20);
  pill(GAS.x - 2, GAS.y - 46, 'بنزينة', C.labelbg, C.label, 12);
  for (const v of VILLAGES) pill(v.x, v.y, v.name, C.labelbg, C.label, 14);
}

function pinColor(o) {
  if (o.status === 'frozen') return S.box[o.part] > 0 ? C.good : C.frozen;
  return C.amber;
}
function drawPins(now) {
  const tNo = S.target && S.target.k === 'o' ? S.target.no : null;
  const pulse = (now / 600) % 1;
  const order = routeOrders();
  // خط السير: خط متقطع من الموتوسيكل للمحطات بالترتيب
  if (order.length) {
    ctx.strokeStyle = C.ink; ctx.globalAlpha = .35; ctx.lineWidth = 4; ctx.setLineDash([2, 12]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(S.bike.x, S.bike.y); for (const o of order) ctx.lineTo(o.x, o.y); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  order.forEach((o, i) => {
    const col = pinColor(o), hx = o.hx ?? o.x, hy = o.hy ?? o.y;
    // خط صغير من البيت لمكان الركنة على الأسفلت
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(o.x, o.y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(o.x, o.y, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = col; ctx.globalAlpha = 1 - pulse; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, 10 + pulse * 26, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    if (o.no === tNo) { ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(o.x, o.y, 40, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    pin(hx, hy, col, String(i + 1), 15);
  });
}
function pin(x, y, col, label, r) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.arc(x, y - r + 1, r, Math.PI * .75, Math.PI * .25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(r * .9)}px "Readex Pro",Tahoma,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y - r + 2);
}
function drawCars() {
  for (const c of cars) {
    const t = CAR_TYPES[c.type];
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    ctx.fillStyle = '#00000033'; ctx.fillRect(-t.len / 2 + 3, -t.wid / 2 + 3, t.len, t.wid);
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.roundRect(-t.len / 2, -t.wid / 2, t.len, t.wid, c.type === 'tuktuk' ? 6 : 4); ctx.fill();
    ctx.fillStyle = '#1d2b3acc';   // زجاج
    if (c.type === 'tractor') { ctx.fillRect(-4, -t.wid / 2 + 2, 10, t.wid - 4); ctx.fillStyle = '#111'; ctx.fillRect(-t.len / 2 - 2, -t.wid / 2 - 3, 11, 4); ctx.fillRect(-t.len / 2 - 2, t.wid / 2 - 1, 11, 4); }
    else if (c.type === 'tuktuk') { ctx.fillRect(2, -t.wid / 2 + 2, 5, t.wid - 4); }
    else { ctx.fillRect(t.len / 2 - 11, -t.wid / 2 + 2, 6, t.wid - 4); ctx.fillRect(-t.len / 2 + 4, -t.wid / 2 + 2, 4, t.wid - 4); }
    if (C.night) { ctx.fillStyle = C.light; ctx.beginPath(); ctx.moveTo(t.len / 2, -t.wid / 2 + 2); ctx.lineTo(t.len / 2 + 60, -22); ctx.lineTo(t.len / 2 + 60, 22); ctx.lineTo(t.len / 2, t.wid / 2 - 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}
function drawBike(b) {
  ctx.save(); ctx.translate(b.x, b.y);
  if (C.night) {
    ctx.rotate(b.a);
    const g = ctx.createRadialGradient(40, 0, 4, 90, 0, 90); g.addColorStop(0, C.light); g.addColorStop(1, '#fff2b500');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(170, -60); ctx.lineTo(170, 60); ctx.closePath(); ctx.fill();
    ctx.rotate(-b.a);
  }
  ctx.fillStyle = '#00000040'; ctx.beginPath(); ctx.ellipse(3, 5, 22, 11, b.a, 0, 7); ctx.fill();
  ctx.rotate(b.a);
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(10, -3.5, 12, 7); ctx.fillRect(-22, -4, 12, 8);
  ctx.fillStyle = C.bad; ctx.beginPath(); ctx.roundRect(-14, -6, 30, 12, 5); ctx.fill();
  ctx.fillStyle = C.navy; ctx.fillRect(-27, -9, 12, 18); ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.strokeRect(-27, -9, 12, 18);
  ctx.strokeStyle = '#222'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(14, 10); ctx.stroke();
  ctx.fillStyle = '#f2c38b'; ctx.beginPath(); ctx.arc(2, 0, 6.5, 0, 7); ctx.fill();
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(1, 0, 6.5, Math.PI * .5, Math.PI * 1.5); ctx.fill();
  ctx.restore();
}
function drawGps(now, toScreen, top) {
  const tg = targetPos(); if (!tg) return;
  const s = toScreen(tg), m = 40, bot = vh - 150;
  if (s.x < m || s.x > vw - m || s.y < top || s.y > bot) {
    const bs = toScreen(S.bike), ang = Math.atan2(s.y - bs.y, s.x - bs.x);
    const ex = Math.max(m, Math.min(vw - m, s.x)), ey = Math.max(top, Math.min(bot, s.y));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
    ctx.fillStyle = C.amber; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else {
    const bob = Math.sin(now / 180) * 5;
    ctx.fillStyle = C.amber; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x, s.y - 48 + bob); ctx.lineTo(s.x - 10, s.y - 62 + bob); ctx.lineTo(s.x + 10, s.y - 62 + bob); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}
function drawMini(y) {
  const w = Math.min(150, vw * .32), h = w * WORLD.h / WORLD.w, x = 12, s = w / WORLD.w;
  ctx.globalAlpha = .92; ctx.fillStyle = C.labelbg; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 8); ctx.fill(); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  path(CANAL); ctx.strokeStyle = C.water; ctx.lineWidth = 60; ctx.stroke();
  for (const r of ROADS) { path(r); ctx.strokeStyle = C.road; ctx.lineWidth = 36; ctx.stroke(); }
  for (const v of VILLAGES) { ctx.fillStyle = C.house; ctx.beginPath(); ctx.arc(v.x, v.y, 70, 0, 7); ctx.fill(); }
  ctx.fillStyle = C.navy; ctx.fillRect(WORKSHOP.x - 60, WORKSHOP.y - 60, 120, 120);
  ctx.fillStyle = C.bad; ctx.fillRect(GAS.x - 40, GAS.y - 40, 80, 80);
  for (const o of S.orders) { if (!isActive(o)) continue; ctx.fillStyle = o.status === 'frozen' ? C.frozen : C.amber; ctx.beginPath(); ctx.arc(o.hx ?? o.x, o.hy ?? o.y, 60, 0, 7); ctx.fill(); }
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(S.bike.x, S.bike.y, 55, 0, 7); ctx.fill();
  ctx.strokeStyle = C.surface; ctx.lineWidth = 18; ctx.stroke();
  ctx.restore();
}
function drawJoy() {
  if (!joy) return;
  ctx.globalAlpha = .35; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 58, 0, 7); ctx.fill();
  ctx.globalAlpha = .85; ctx.fillStyle = C.amber;
  let dx = joy.x - joy.ox, dy = joy.y - joy.oy; const m = Math.hypot(dx, dy);
  if (m > 58) { dx *= 58 / m; dy *= 58 / m; }
  ctx.beginPath(); ctx.arc(joy.ox + dx, joy.oy + dy, 24, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
}

/* ---------- خريطة التخطيط (في لوحة أوامر الورشة) ----------
   الخريطة كلها مصغّرة: القرى بأساميها، الأوامر بأرقامها في خط السير،
   والخط من الورشة للمحطات بالترتيب. الأمر المختار عليه دايرة. */
export function drawPlan(canvas, selNo) {
  if (!canvas) return;
  const w = canvas.clientWidth || 320, h = w * WORLD.h / WORLD.w, pr = Math.min(2, devicePixelRatio || 1);
  canvas.width = w * pr; canvas.height = h * pr; canvas.style.height = h + 'px';
  const g = canvas.getContext('2d'), s = w / WORLD.w;
  const prev = ctx; ctx = g;   // نعيد استخدام نفس دوال الرسم
  g.setTransform(pr, 0, 0, pr, 0, 0); g.fillStyle = C.grass; g.fillRect(0, 0, w, h);
  g.setTransform(pr * s, 0, 0, pr * s, 0, 0);
  for (const f of FIELDS) { g.save(); g.translate(f.x + f.w / 2, f.y + f.h / 2); g.rotate(f.r); g.fillStyle = C['field' + f.c]; g.fillRect(-f.w / 2, -f.h / 2, f.w, f.h); g.restore(); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  path(CANAL); g.strokeStyle = C.water; g.lineWidth = 60; g.stroke();
  for (const r of ROADS) { path(r); g.strokeStyle = C.road; g.lineWidth = 34; g.stroke(); }
  for (const v of VILLAGES) { g.fillStyle = C.road; g.beginPath(); g.arc(v.x, v.y, 60, 0, 7); g.fill(); for (const hs of v.houses) { g.fillStyle = C.house; g.fillRect(hs.x - hs.w / 2, hs.y - hs.h / 2, hs.w, hs.h); } }
  g.fillStyle = C.navy; g.fillRect(WORKSHOP.x - 70, WORKSHOP.y - 70, 140, 120);
  g.fillStyle = C.bad; g.fillRect(GAS.x - 40, GAS.y - 35, 80, 60);
  const order = routeOrders();
  g.strokeStyle = C.ink; g.globalAlpha = .55; g.lineWidth = 14; g.setLineDash([10, 34]);
  g.beginPath(); g.moveTo(S.bike.x, S.bike.y); for (const o of order) g.lineTo(o.x, o.y); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
  // أسماء القرى (بحجم مقروء مهما الخريطة صغرت)
  const fs = 11 / s;
  for (const v of VILLAGES) pill(v.x, v.y + 110, v.name, C.labelbg, C.label, fs);
  pill(WORKSHOP.x, WORKSHOP.y + 120, 'الورشة', C.amber, '#1c1404', fs);
  order.forEach((o, i) => {
    const x = o.hx ?? o.x, y = o.hy ?? o.y;
    if (o.no === selNo) { g.strokeStyle = C.ink; g.lineWidth = 12; g.beginPath(); g.arc(x, y - 50, 110, 0, 7); g.stroke(); }
    pin(x, y, pinColor(o), String(i + 1), 13 / s);
  });
  g.fillStyle = C.ink; g.beginPath(); g.arc(S.bike.x, S.bike.y, 40, 0, 7); g.fill();
  ctx = prev;
}
