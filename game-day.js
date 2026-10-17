/* اليوم: الصبح أوامر جديدة ومخزن، وآخر اليوم تقفيل اليومية */
import { BAL } from './config.js';
import { WORKSHOP } from './data-world.js';
import { local } from './core-util.js';
import { emit } from './core-events.js';
import { S, addRep } from './game-state.js';
import { createDayOrders, isActive, nextStop, tickRepair } from './game-orders.js';
import { restockStore, returnAll } from './game-shop.js';

export const clockText = () => {
  const m = Math.round(S.clock) % (24 * 60);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
};

export function startDay(r = Math.random) {
  S.phase = 'play'; S.clock = BAL.dayStart; S.repair = null; S.target = null;
  S.bike = { x: WORKSHOP.x, y: WORKSHOP.y + 40, a: -Math.PI / 2, v: 0 };
  S.stats = { done: 0, coll: 0, deps: 0, labor: 0, parts: 0, visits: 0, km: 0, fuel: 0, rep0: S.rep };
  // الأوامر المترحّلة من امبارح بتفضل في أول خط السير
  S.orders = S.orders.filter(isActive);
  S.route = S.route.filter((no) => S.orders.some((o) => o.no === no));
  if (S.orders.length) addRep(BAL.rep.carriedOver * S.orders.length);
  restockStore(r);
  createDayOrders(BAL.ordersPerDay, r);
  emit('sound', 'start');
}

/* كل فريم: الساعة بتمشي مع المسافة، والتصليح بيكمّل */
export function tickDay(dt) {
  tickRepair(dt);
  if (!S.target) { const n = nextStop(); if (n) S.target = { k: 'o', no: n.no }; }
}

/* تقفيل اليومية في الورشة:
   - العهدة كلها بتتسلّم للورشة
   - المصنعية بتاعة الأوامر اللي خلصت بتتحسب ليك في رصيدك
   - القطع اللي ما اتستخدمتش بترجع المخزن */
export function closeDay() {
  if (S.repair) return null;
  const st = S.stats;
  const handed = S.custody;
  const labor = st.labor;
  S.wallet += handed - labor;   // الورشة بتاخد العهدة ناقص مصنعيتك
  S.balance += labor;
  S.custody = 0;
  returnAll();
  S.phase = 'report';
  const best = local.get('mw-best', { day: 0, income: 0 });
  if (S.day > best.day || (S.day === best.day && S.total > best.income)) local.set('mw-best', { day: S.day, income: S.total });
  const summary = { handed, labor, open: S.orders.filter(isActive).length };
  emit('sound', 'bell');
  emit('day:end', summary);
  return summary;
}

export const bestScore = () => local.get('mw-best', null);
