/* الورشة والبنزينة: تسليم العهدة، تحميل قطع، تطوير، تفويل */
import { BAL } from './config.js';
import { PARTS } from './data-devices.js';
import { emit } from './core-events.js';
import { S, boxCount } from './game-state.js';

export function handOverCustody() {
  if (S.custody <= 0) return 0;
  const v = S.custody;
  S.wallet += v; S.custody = 0;
  emit('toast', { msg: `سلّمت العهدة ${v} ج للمحفظة`, kind: 'good' });
  emit('sound', 'coin');
  return v;
}

export function canLoad(k) { return S.wallet >= PARTS[k].cost && boxCount() < S.cap; }

export function loadPart(k) {
  if (!canLoad(k)) return false;
  S.wallet -= PARTS[k].cost;
  S.box[k] = (S.box[k] || 0) + 1;
  // لو فيه أمر مجمد مستني القطعة دي، خليه الوجهة الجاية
  const waiting = S.orders.find((o) => o.status === 'frozen' && o.part === k);
  if (waiting && S.box[k] === 1) S.target = { k: 'o', no: waiting.no };
  emit('sound', 'ping');
  return true;
}

/* تنزيل قطعة من الصندوق للمخزن (بترجع فلوسها للمحفظة) — عشان تفضّي مكان */
export function unloadPart(k) {
  if (!(S.box[k] > 0)) return false;
  S.box[k]--;
  S.wallet += PARTS[k].cost;
  emit('sound', 'ping');
  return true;
}

export function upgradeState(key) {
  const u = BAL.upgrades[key];
  if (key === 'cap') return { done: S.cap >= u.max, can: S.wallet >= u.cost && S.cap < u.max };
  if (key === 'fast') return { done: S.fast, can: S.wallet >= u.cost && !S.fast };
  if (key === 'tank') return { done: S.tank >= u.max, can: S.wallet >= u.cost && S.tank < u.max };
}

export function buyUpgrade(key) {
  const u = BAL.upgrades[key];
  if (!upgradeState(key).can) return false;
  S.wallet -= u.cost;
  if (key === 'cap') S.cap += u.step;
  if (key === 'fast') S.fast = true;
  if (key === 'tank') S.tank += u.step;
  emit('sound', 'coin');
  return true;
}

export const fuelCost = () => Math.ceil((S.tank - S.fuel) * BAL.fuelPrice);

/* البنزين بيتدفع من العهدة الأول، والباقي من المحفظة */
export function refuel() {
  const c = fuelCost();
  if (c <= 0 || S.custody + S.wallet < c) return false;
  const fromCustody = Math.min(S.custody, c);
  S.custody -= fromCustody; S.wallet -= c - fromCustody;
  if (S.stats) S.stats.fuel += c;
  const liters = S.tank - S.fuel;
  S.fuel = S.tank;
  emit('sound', 'coin');
  emit('toast', { msg: `فوّلت ${liters.toFixed(1)} لتر بـ ${c} ج` });
  return true;
}
