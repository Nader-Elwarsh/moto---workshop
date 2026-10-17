/* ناقل أحداث بسيط: منطق اللعبة يبعت أحداث، والواجهة تسمعها.
   كده ملفات المنطق (game-*.js) ما بتلمسش الـ DOM وتقدر تتختبر في Node. */

const handlers = new Map();

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name).add(fn);
  return () => handlers.get(name).delete(fn);
}

export function emit(name, payload) {
  const set = handlers.get(name);
  if (set) for (const fn of set) fn(payload);
}

/* الأحداث المستخدمة:
   'toast'   {msg, kind}      رسالة قصيرة للاعب
   'sound'   kind             صوت (coin, bad, ping, start, bell, horn)
   'orders'  —                قائمة الأوامر اتغيرت
   'day:end' summary          الوردية خلصت
*/
