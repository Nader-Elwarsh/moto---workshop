/* حالة اللعبة كلها في كائن واحد S. كل الملفات بتستورده وبتعدّل فيه.
   ما بيتعملوش reassign أبدًا؛ إعادة البدء بتفضيه وتملاه من جديد. */
import { BAL } from './config.js';
import { WORKSHOP } from './data-world.js';

export const S = {};

export function freshState() {
  return {
    day: 1, t: 0, phase: 'intro',            // intro | play | report | over
    wallet: BAL.start.wallet,                // فلوس الورشة
    custody: 0,                              // عهدة الفني (اللي معاه في جيبه)
    rep: BAL.start.rep,                      // تقييم العملاء 0..5
    fuel: BAL.start.fuel, tank: BAL.start.tank,
    cap: BAL.start.boxCap, fast: false,
    box: { ...BAL.startBox },                // قطع الغيار اللي على الموتوسيكل
    bike: { x: WORKSHOP.x, y: WORKSHOP.y + 40, a: -Math.PI / 2, v: 0 },
    orders: [], nextNo: 1001, spawnIn: BAL.requests.firstAt,
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
