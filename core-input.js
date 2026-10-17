/* التحكم: عصا تحكم عائمة باللمس (اسحب في أي حتة) + الأسهم/WASD */

const keys = {};
const DRIVE_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
export let joy = null;
let enabled = () => true;

export function initInput(canvas, isEnabled) {
  enabled = isEnabled;
  addEventListener('keydown', (e) => { const k = e.key.toLowerCase(); if (DRIVE_KEYS.includes(k)) { keys[k] = 1; e.preventDefault(); } });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = 0; });
  canvas.addEventListener('pointerdown', (e) => {
    if (!enabled()) return;
    canvas.setPointerCapture(e.pointerId);
    joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointermove', (e) => { if (joy && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
  const end = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  document.addEventListener('visibilitychange', () => { joy = null; });
}

export function releaseJoy() { joy = null; }

/* بيرجّع اتجاه (x,y) وقوة m من 0 لـ 1 */
export function readInput() {
  if (!enabled()) return { x: 0, y: 0, m: 0 };
  if (joy) {
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, m = Math.hypot(dx, dy);
    if (m < 8) return { x: 0, y: 0, m: 0 };
    return { x: dx / m, y: dy / m, m: Math.min(1, m / 60) };
  }
  const x = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  const y = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
  const m = Math.hypot(x, y);
  return m ? { x: x / m, y: y / m, m: 1 } : { x: 0, y: 0, m: 0 };
}
