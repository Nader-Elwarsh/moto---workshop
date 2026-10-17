/* الورشة: المخزن (تاخد/ترجّع قطع)، التطوير، والبنزينة */
import { BAL } from './config.js';
import { PARTS } from './data-devices.js';
import { emit } from './core-events.js';
import { S, boxCount } from './game-state.js';
import { isActive } from './game-orders.js';

/* المخزن الصبح: كمية عشوائية من كل قطعة. القطع اللي أوامر مجمدة مستنياها
   بتوصل من المورد (+1)، والقطع اللي رجعت امبارح بتفضل. */
export function restockStore(r = Math.random) {
  for (const k of Object.keys(PARTS)) {
    const fresh = BAL.store.min + Math.floor(r() * (BAL.store.max - BAL.store.min + 1));
    S.store[k] = Math.max(S.store[k] || 0, fresh);
  }
  for (const o of S.orders) if (o.status === 'frozen') S.store[o.part] = (S.store[o.part] || 0) + 1;
}

/* القطع اللي أوامر النهارده محتاجاها (عشان نعلّم عليها في المخزن) */
export function neededParts() {
  const need = {};
  for (const o of S.orders) if (isActive(o) && o.status !== 'done') need[o.part] = (need[o.part] || 0) + 1;
  return need;
}

export const canTake = (k) => (S.store[k] || 0) > 0 && boxCount() < S.cap;

export function takePart(k) {
  if (!canTake(k)) return false;
  S.store[k]--; S.box[k] = (S.box[k] || 0) + 1;
  emit('sound', 'ping');
  return true;
}

export function returnPart(k) {
  if (!(S.box[k] > 0)) return false;
  S.box[k]--; S.store[k] = (S.store[k] || 0) + 1;
  emit('sound', 'ping');
  return true;
}

export function returnAll() {
  for (const k of Object.keys(S.box)) { S.store[k] = (S.store[k] || 0) + S.box[k]; S.box[k] = 0; }
}

/* ---------- التطوير (من رصيدك) ---------- */
export function upgradeState(key) {
  const u = BAL.upgrades[key];
  if (key === 'cap') return { done: S.cap >= u.max, can: S.balance >= u.cost && S.cap < u.max };
  if (key === 'fast') return { done: S.fast, can: S.balance >= u.cost && !S.fast };
  if (key === 'tank') return { done: S.tank >= u.max, can: S.balance >= u.cost && S.tank < u.max };
}

export function buyUpgrade(key) {
  const u = BAL.upgrades[key];
  if (!upgradeState(key).can) return false;
  S.balance -= u.cost;
  if (key === 'cap') S.cap += u.step;
  if (key === 'fast') S.fast = true;
  if (key === 'tank') S.tank += u.step;
  emit('sound', 'coin');
  emit('toast', { msg: `اتركّب: ${u.name}`, kind: 'good' });
  return true;
}

/* ---------- البنزين (من العهدة الأول، وبعدين من رصيدك) ---------- */
export const fuelCost = () => Math.ceil((S.tank - S.fuel) * BAL.fuelPrice);

export function refuel() {
  const c = fuelCost();
  if (c <= 0 || S.custody + S.balance < c) return false;
  const fromCustody = Math.min(S.custody, c);
  S.custody -= fromCustody; S.balance -= c - fromCustody;
  if (S.stats) S.stats.fuel += c;
  const liters = S.tank - S.fuel;
  S.fuel = S.tank;
  emit('sound', 'coin');
  emit('toast', { msg: `فوّلت ${liters.toFixed(1)} لتر بـ ${c} ج` });
  return true;
}
