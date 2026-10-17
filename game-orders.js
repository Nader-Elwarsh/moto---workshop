/* =========================================================
   دورة حياة أمر الشغل — نفس منطق نظام الورشة الفنية:
     طلب وارد → جديد → جاري التنفيذ → مكتمل
                         ↘ مجمد (مستني قطعة) ↗
     جديد / جاري التنفيذ → ملغي (العميل زهق)
   كل تغيير حالة بيتسجل في o.log بالوقت.
   الملف ده مافيهوش DOM، فبيتختبر في orders.test.js
   ========================================================= */
import { BAL } from './config.js';
import { DEVICES, PARTS } from './data-devices.js';
import { VILLAGES } from './data-world.js';
import { FIRST_NAMES, LAST_NAMES } from './data-people.js';
import { rnd, between, round10 } from './core-util.js';
import { emit } from './core-events.js';
import { S, byNo, addRep } from './game-state.js';

export const STATUS = { REQ: 'req', NEW: 'new', PROGRESS: 'progress', FROZEN: 'frozen', DONE: 'done', CANCELLED: 'cancelled', DECLINED: 'declined' };

export const LABEL = {
  req: 'طلب وارد', new: 'جديد', progress: 'جاري التنفيذ', frozen: 'مجمد',
  done: 'مكتمل', cancelled: 'ملغي', declined: 'اتعتذر عنه',
};

const FLOW = {
  req: ['new', 'declined'],
  new: ['progress', 'cancelled'],
  progress: ['frozen', 'done', 'cancelled'],
  frozen: ['progress', 'cancelled'],
  done: [], cancelled: [], declined: [],
};

export const ACTIVE = ['new', 'progress', 'frozen'];
export const isActive = (o) => ACTIVE.includes(o.status);
export const canMove = (from, to) => (FLOW[from] || []).includes(to);

export function move(o, to) {
  if (!canMove(o.status, to)) throw new Error(`انتقال غير مسموح: ${o.status} → ${to}`);
  o.log.push({ from: o.status, to, day: S.day, t: Math.round(S.t) });
  o.status = to;
  emit('orders');
}

/* ---------- الحسابات ---------- */
export const priceOf = (o) => round10(PARTS[o.part].cost + PARTS[o.part].labor + BAL.visitFee);
export const depositOf = (o) => round10(PARTS[o.part].cost * BAL.depositPartShare + BAL.visitFee);

/* ---------- إنشاء طلب ---------- */
export function createRequest(r = Math.random) {
  const open = S.orders.filter((o) => o.status === 'req' || isActive(o));
  if (open.length >= BAL.requests.maxActive) return null;
  const used = new Set(open.map((o) => o.vi + ':' + o.hi));
  let vi, hi, guard = 0;
  do { vi = Math.floor(r() * VILLAGES.length); hi = Math.floor(r() * VILLAGES[vi].houses.length); } while (used.has(vi + ':' + hi) && ++guard < 30);
  const house = VILLAGES[vi].houses[hi];
  const dev = rnd(Object.keys(DEVICES), r), d = DEVICES[dev], f = rnd(d.faults, r);
  const patMax = BAL.requests.patience(S.day, S.rep);
  const o = {
    no: S.nextNo++, cust: rnd(FIRST_NAMES, r) + ' ' + rnd(LAST_NAMES, r),
    phone: '01' + rnd(['0', '1', '2', '5'], r) + String(Math.floor(between(10000000, 99999999, r))),
    vi, hi, x: house.x, y: house.y - house.h / 2 - 4,
    dev, brand: rnd(d.brands, r), code: f.code, sym: f.sym, part: f.part,
    status: 'req', exp: BAL.requests.expire, expMax: BAL.requests.expire,
    pat: patMax, patMax, dep: 0, log: [],
  };
  S.orders.push(o);
  emit('sound', 'ping');
  emit('orders');
  return o;
}

/* ---------- أفعال اللاعب ---------- */
export function accept(no) {
  const o = byNo(no); if (!o || o.status !== 'req') return;
  move(o, 'new');
  if (!S.target) S.target = { k: 'o', no };
  emit('toast', { msg: `أمر #${no} اتضاف لخط السير — ${VILLAGES[o.vi].name}` });
  emit('sound', 'start');
}

export function decline(no) {
  const o = byNo(no); if (o && o.status === 'req') move(o, 'declined');
}

/* الفحص: اللاعب بيختار القطعة. الصح → جاري التنفيذ، الغلط → عقوبة */
export function diagnose(no, partKey) {
  const o = byNo(no); if (!o || o.status !== 'new') return false;
  if (partKey !== o.part) {
    addRep(BAL.rep.wrongDiag);
    o.pat = Math.max(5, o.pat - o.patMax * .15);
    emit('sound', 'bad');
    emit('toast', { msg: `تشخيص غلط — ${PARTS[partKey].name} سليمة. العميل اتضايق.`, kind: 'bad' });
    return false;
  }
  move(o, 'progress');
  emit('sound', 'start');
  return true;
}

/* إيقاف الأمر على قطعة غيار: عربون في العهدة والأمر يتجمد (صبر العميل يقف) */
export function freezeForPart(no) {
  const o = byNo(no); if (!o || o.status !== 'progress') return;
  o.dep = depositOf(o);
  S.custody += o.dep; S.total += o.dep; if (S.stats) S.stats.deps += o.dep;
  move(o, 'frozen');
  S.target = { k: 'ws' };
  emit('sound', 'coin');
  emit('toast', { msg: `عربون ${o.dep} ج في العهدة — أمر #${no} مجمد على ${PARTS[o.part].name}`, kind: 'good' });
}

export function startRepair(no) {
  const o = byNo(no); if (!o || !(S.box[o.part] > 0) || S.repair) return;
  if (o.status === 'frozen') { o.wasFrozen = true; move(o, 'progress'); }
  if (o.status !== 'progress') return;
  S.repair = { no, t: 0, max: BAL.repairTime(PARTS[o.part].labor) };
}

export function finishRepair() {
  const o = byNo(S.repair.no); S.repair = null; if (!o) return;
  S.box[o.part]--;
  const rest = priceOf(o) - o.dep;
  S.custody += rest; S.total += rest;
  if (S.stats) { S.stats.coll += rest; S.stats.done++; }
  const f = o.wasFrozen ? .6 : o.pat / o.patMax;
  const d = f > .5 ? BAL.rep.happy : f > .25 ? BAL.rep.ok : 0;
  addRep(d);
  move(o, 'done');
  if (S.target && S.target.no === o.no) S.target = null;
  emit('sound', 'coin');
  emit('toast', { msg: `تم التصليح · تحصيل ${rest} ج في العهدة${d >= BAL.rep.happy ? ' · العميل مبسوط جدًا' : ''}`, kind: 'good' });
}

export function cancel(o) {
  addRep(BAL.rep.cancel);
  if (S.stats) S.stats.cancelled++;
  move(o, 'cancelled');
  if (S.target && S.target.no === o.no) S.target = null;
  emit('sound', 'bad');
  emit('toast', { msg: `العميل ${o.cust} زهق ولغى أمر #${o.no}`, kind: 'bad' });
}

/* ---------- مرور الوقت على الأوامر ---------- */
export function tickOrders(dt, openNo) {
  for (const o of S.orders) {
    if (o.status === 'req') {
      o.exp -= dt;
      if (o.exp <= 0) { addRep(BAL.rep.missed); move(o, 'declined'); emit('toast', { msg: `طلب #${o.no} اتفوّت من غير رد` }); }
    } else if ((o.status === 'new' || o.status === 'progress') && o.no !== openNo) {
      o.pat -= dt;                          // المجمد مابيعدّش (زي النظام)
      if (o.pat <= 0) cancel(o);
    }
  }
  if (S.repair) {
    S.repair.t += dt;
    if (S.repair.t >= S.repair.max) finishRepair();
  }
}
