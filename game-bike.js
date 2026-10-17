/* فيزيا الموتوسيكل: لف ناحية اتجاه التحكم، وسرعة حسب الأرض والبنزين */
import { BAL } from './config.js';
import { WORLD, surfaceAt } from './data-world.js';
import { clamp } from './core-util.js';
import { emit } from './core-events.js';
import { S } from './game-state.js';

export let surface = 'road';

export function updateBike(dt, input) {
  const b = S.bike;
  surface = surfaceAt(b.x, b.y);
  let max = BAL.speed[surface] * (S.fast ? BAL.fastBonus : 1);
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
  b.x = clamp(b.x + Math.cos(b.a) * b.v * dt, 20, WORLD.w - 20);
  b.y = clamp(b.y + Math.sin(b.a) * b.v * dt, 20, WORLD.h - 20);

  const moved = b.v * dt, before = S.fuel;
  S.fuel = Math.max(0, S.fuel - moved * BAL.fuelPerPx);
  S.clock += moved * BAL.mPerPx / 1000 * BAL.minutesPerKm;   // الساعة بتمشي مع المسافة
  if (S.stats) S.stats.km += moved * BAL.mPerPx / 1000;
  if (before > 1.5 && S.fuel <= 1.5) { emit('toast', { msg: 'البنزين قرب يخلص — روح البنزينة', kind: 'bad' }); emit('sound', 'horn'); }
  if (before > 0 && S.fuel <= 0) emit('toast', { msg: 'البنزين خلص! الموتوسيكل بيتزق بالعافية.', kind: 'bad' });
}
