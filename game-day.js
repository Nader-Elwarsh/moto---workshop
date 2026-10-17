/* الوردية: بداية اليوم، مرور الوقت، نهاية اليوم والتقرير */
import { BAL } from './config.js';
import { WORKSHOP } from './data-world.js';
import { between, local } from './core-util.js';
import { emit } from './core-events.js';
import { S } from './game-state.js';
import { createRequest, tickOrders, isActive } from './game-orders.js';

export const clockText = () => {
  const m = Math.floor(Math.min(S.t, BAL.dayLen) / BAL.dayLen * 480);
  return (9 + Math.floor(m / 60)) + ':' + String(m % 60).padStart(2, '0');
};

export function startDay() {
  S.t = 0; S.phase = 'play'; S.spawnIn = BAL.requests.firstAt; S.repair = null; S.target = null;
  S.bike = { x: WORKSHOP.x, y: WORKSHOP.y + 40, a: -Math.PI / 2, v: 0 };
  S.stats = { done: 0, cancelled: 0, coll: 0, deps: 0, km: 0, fuel: 0, rep0: S.rep };
  // الأوامر المفتوحة بتترحّل لبكرة، والعميل بيدّي فرصة جديدة
  S.orders = S.orders.filter(isActive);
  for (const o of S.orders) if (o.status !== 'frozen') o.pat = Math.max(o.pat, o.patMax * .7);
  emit('orders');
  emit('sound', 'start');
}

export function tickDay(dt, openNo) {
  S.t += dt;
  S.spawnIn -= dt;
  if (S.spawnIn <= 0 && S.t < BAL.dayLen - 25) {
    createRequest();
    S.spawnIn = BAL.requests.gap(S.day) * between(.75, 1.25) * (1.1 - S.rep / 5 * .2);
  }
  tickOrders(dt, openNo);
  if (!S.target) {
    const next = S.orders.find((o) => o.status === 'new') || S.orders.find((o) => o.status === 'frozen' && S.box[o.part] > 0);
    if (next) S.target = { k: 'o', no: next.no };
  }
  if (S.t >= BAL.dayLen) endDay();
}

export function endDay() {
  S.phase = 'report'; S.repair = null;
  const handed = S.custody;
  S.wallet += S.custody; S.custody = 0;
  // الطلبات اللي ماتردش عليها بتروح
  for (const o of S.orders) if (o.status === 'req') o.status = 'declined';

  const best = local.get('mw-best', { day: 0, income: 0 });
  if (S.day > best.day || (S.day === best.day && S.total > best.income)) local.set('mw-best', { day: S.day, income: S.total });

  if (S.rep < BAL.rep.gameOverBelow) S.phase = 'over';
  emit('sound', 'bell');
  emit('day:end', { handed, carry: S.orders.filter(isActive).length });
}

export const bestScore = () => local.get('mw-best', null);
