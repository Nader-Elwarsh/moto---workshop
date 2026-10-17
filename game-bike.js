/* فيزيا الموتوسيكل: لف ناحية اتجاه التحكم، وماشي على الأسفلت بس.
   لو حاولت تطلع برا الطريق بيتزحلق على حافته. */
import { BAL } from './config.js';
import { snapToDrivable } from './data-world.js';
import { clamp } from './core-util.js';
import { emit } from './core-events.js';
import { S } from './game-state.js';

export function updateBike(dt, input) {
  const b = S.bike;
  let max = BAL.speed.road * (S.fast ? BAL.fastBonus : 1);
  if (S.fuel <= 0) max = BAL.speed.empty;

  let target = 0;
  if (input.m > 0) {
    const ta = Math.atan2(input.y, input.x);
    let d = ta - b.a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    b.a += clamp(d, -6 * dt, 6 * dt);
    target = max * input.m * (Math.abs(d) > 2.2 ? .4 : 1);
  }
  b.v += (target - b.v) * Math.min(1, dt * (target > b.v ? 2.4 : 4.5));

  const ox = b.x, oy = b.y;
  const p = snapToDrivable(b.x + Math.cos(b.a) * b.v * dt, b.y + Math.sin(b.a) * b.v * dt);
  b.x = p.x; b.y = p.y;
  const moved = Math.hypot(b.x - ox, b.y - oy);
  // لو الحافة وقفته خالص، السرعة تقل (زي ما تكون خبطت في الرصيف)
  if (Math.abs(b.v) * dt > 0.5 && moved < Math.abs(b.v) * dt * .3) b.v *= .5;

  const before = S.fuel;
  S.fuel = Math.max(0, S.fuel - moved * BAL.fuelPerPx);
  S.clock += moved * BAL.mPerPx / 1000 * BAL.minutesPerKm;   // الساعة بتمشي مع المسافة
  if (S.stats) S.stats.km += moved * BAL.mPerPx / 1000;
  if (before > 1.5 && S.fuel <= 1.5) { emit('toast', { msg: 'البنزين قرب يخلص — روح البنزينة', kind: 'bad' }); emit('sound', 'horn'); }
  if (before > 0 && S.fuel <= 0) emit('toast', { msg: 'البنزين خلص! الموتوسيكل بيتزق بالعافية.', kind: 'bad' });
}
