/* حالة اللعبة كلها في كائن واحد S. كل الملفات بتستورده وبتعدّل فيه.
   ما بيتعملوش reassign أبدًا؛ إعادة البدء بتفضيه وتملاه من جديد. */
import { BAL } from './config.js';
import { WORKSHOP } from './data-world.js';

export const S = {};

export function freshState() {
  return {
    day: 1, phase: 'intro',                  // intro | play | report
    clock: BAL.dayStart,                     // ساعة اللعبة بالدقايق (540 = 9:00)
    wallet: BAL.start.wallet,                // خزنة الورشة
    balance: BAL.start.balance,              // رصيدك إنت (المصنعية) — منه بتطوّر
    custody: 0,                              // عهدة: الفلوس اللي معاك من العملاء النهارده
    rep: BAL.start.rep,                      // تقييم العملاء 0..5
    fuel: BAL.start.fuel, tank: BAL.start.tank,
    cap: BAL.start.boxCap, fast: false,
    store: {},                               // مخزن الورشة {partKey: qty}
    box: {},                                 // صندوق الموتوسيكل {partKey: qty}
    bike: { x: WORKSHOP.x, y: WORKSHOP.y + 40, a: -Math.PI / 2, v: 0 },
    orders: [], nextNo: 1001,
    route: [],                               // ترتيب خط السير (أرقام الأوامر)
    target: null,                            // {k:'o',no} | {k:'ws'} | {k:'gas'}
    repair: null,                            // {no, t, max}
    stats: null, total: 0,
  };
}

export function resetState(from) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, from || freshState());
}

export const boxCount = () => Object.values(S.box).reduce((a, b) => a + b, 0);
export const byNo = (no) => S.orders.find((o) => o.no === no);
export function addRep(d) { S.rep = Math.max(0, Math.min(5, S.rep + d)); }
