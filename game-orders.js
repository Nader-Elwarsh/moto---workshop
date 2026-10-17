/* =========================================================
   دورة حياة أمر الشغل — نفس منطق نظام الورشة الفنية:
     جديد → جاري التنفيذ → مكتمل
                 ↘ مجمد (مستني قطعة) ↗
   مفيش ضغط وقت: الأوامر بتنزل الصبح، والفني بيشتغل براحته.
   كل تغيير حالة بيتسجل في o.log.
   الملف ده مافيهوش DOM، فبيتختبر في orders.test.js
   ========================================================= */
import { BAL } from './config.js';
import { DEVICES, PARTS } from './data-devices.js';
import { VILLAGES } from './data-world.js';
import { FIRST_NAMES, LAST_NAMES } from './data-people.js';
import { rnd, between, round10 } from './core-util.js';
import { emit } from './core-events.js';
import { S, byNo, addRep } from './game-state.js';

export const STATUS = { NEW: 'new', PROGRESS: 'progress', FROZEN: 'frozen', DONE: 'done', CANCELLED: 'cancelled' };

export const LABEL = { new: 'جديد', progress: 'جاري التنفيذ', frozen: 'مجمد', done: 'مكتمل', cancelled: 'ملغي' };

const FLOW = {
  new: ['progress', 'cancelled'],
  progress: ['frozen', 'done', 'cancelled'],
  frozen: ['progress', 'cancelled'],
  done: [], cancelled: [],
};

export const ACTIVE = ['new', 'progress', 'frozen'];
export const isActive = (o) => ACTIVE.includes(o.status);
export const canMove = (from, to) => (FLOW[from] || []).includes(to);

export function move(o, to) {
  if (!canMove(o.status, to)) throw new Error(`انتقال غير مسموح: ${o.status} → ${to}`);
  o.log.push({ from: o.status, to, day: S.day, clock: Math.round(S.clock) });
  o.status = to;
  emit('orders');
}

/* ---------- الحسابات ---------- */
export const laborOf = (o) => PARTS[o.part].labor;
export const priceOf = (o) => round10(PARTS[o.part].cost + PARTS[o.part].labor + BAL.visitFee);
export const depositOf = (o) => round10(PARTS[o.part].cost * BAL.depositPartShare + BAL.visitFee);

/* ---------- أوامر اليوم ---------- */
export function createOrder(r = Math.random) {
  const used = new Set(S.orders.filter(isActive).map((o) => o.vi + ':' + o.hi));
  let vi, hi, guard = 0;
  do { vi = Math.floor(r() * VILLAGES.length); hi = Math.floor(r() * VILLAGES[vi].houses.length); } while (used.has(vi + ':' + hi) && ++guard < 40);
  const house = VILLAGES[vi].houses[hi];
  const dev = rnd(Object.keys(DEVICES), r), d = DEVICES[dev], f = rnd(d.faults, r);
  const o = {
    no: S.nextNo++, day: S.day, cust: rnd(FIRST_NAMES, r) + ' ' + rnd(LAST_NAMES, r),
    phone: '01' + rnd(['0', '1', '2', '5'], r) + String(Math.floor(between(10000000, 99999999, r))),
    vi, hi, x: house.x, y: house.y - house.h / 2 - 4,
    dev, brand: rnd(d.brands, r), code: f.code, sym: f.sym, part: f.part,
    status: 'new', dep: 0, log: [],
  };
  S.orders.push(o);
  S.route.push(o.no);
  return o;
}

export function createDayOrders(n = BAL.ordersPerDay, r = Math.random) {
  const list = [];
  for (let i = 0; i < n; i++) list.push(createOrder(r));
  emit('orders');
  return list;
}

/* ---------- خط السير ---------- */
export const routeOrders = () => S.route.map(byNo).filter((o) => o && isActive(o));

export function moveInRoute(no, dir) {
  const i = S.route.indexOf(no), j = i + dir;
  if (i < 0 || j < 0 || j >= S.route.length) return;
  [S.route[i], S.route[j]] = [S.route[j], S.route[i]];
  emit('orders');
}

/* الوجهة الجاية: أول أمر في الترتيب ممكن يتعمل فيه حاجة دلوقتي */
export function nextStop() {
  return routeOrders().find((o) => o.status !== 'frozen' || S.box[o.part] > 0) || null;
}

/* ---------- أفعال الفني ---------- */
export function diagnose(no, partKey) {
  const o = byNo(no); if (!o || o.status !== 'new') return false;
  if (partKey !== o.part) {
    addRep(BAL.rep.wrongDiag);
    emit('sound', 'bad');
    emit('toast', { msg: `تشخيص غلط — ${PARTS[partKey].name} سليمة. جرّب تاني.`, kind: 'bad' });
    return false;
  }
  move(o, 'progress');
  emit('sound', 'start');
  return true;
}

/* إيقاف الأمر على قطعة غيار: عربون في العهدة والأمر يتجمد لحد ما القطعة تيجي */
export function freezeForPart(no) {
  const o = byNo(no); if (!o || o.status !== 'progress') return;
  o.dep = depositOf(o);
  S.custody += o.dep; S.total += o.dep; if (S.stats) S.stats.deps += o.dep;
  move(o, 'frozen');
  emit('sound', 'coin');
  emit('toast', { msg: `عربون ${o.dep} ج في العهدة — أمر #${no} مجمد على ${PARTS[o.part].name}`, kind: 'good' });
}

export function startRepair(no) {
  const o = byNo(no); if (!o || !(S.box[o.part] > 0) || S.repair) return;
  if (o.status === 'frozen') move(o, 'progress');
  if (o.status !== 'progress') return;
  S.repair = { no, t: 0, max: BAL.repairTime(laborOf(o)) };
}

export function finishRepair() {
  const o = byNo(S.repair.no); S.repair = null; if (!o) return;
  S.box[o.part]--;
  const rest = priceOf(o) - o.dep;
  S.custody += rest; S.total += rest;
  S.clock += BAL.repairMinutes(laborOf(o));
  if (S.stats) { S.stats.coll += rest; S.stats.done++; S.stats.labor += laborOf(o); S.stats.parts += PARTS[o.part].cost; S.stats.visits += BAL.visitFee; }
  addRep(o.day === S.day ? BAL.rep.doneSameDay : BAL.rep.done);
  move(o, 'done');
  if (S.target && S.target.no === o.no) S.target = null;
  emit('sound', 'coin');
  emit('toast', { msg: `تم التصليح · حصّلت ${rest} ج · مصنعيتك ${laborOf(o)} ج`, kind: 'good' });
}

export function tickRepair(dt) {
  if (!S.repair) return;
  S.repair.t += dt;
  if (S.repair.t >= S.repair.max) finishRepair();
}
