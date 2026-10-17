import { BAL } from './config.js';

export const rnd = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
export const between = (a, b, r = Math.random) => a + r() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const fmt = (n) => Math.round(n).toLocaleString('en-US');
export const round10 = (n) => Math.round(n / 10) * 10;

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function km(px) {
  const m = px * BAL.mPerPx;
  return m < 1000 ? Math.round(m / 10) * 10 + ' م' : (m / 1000).toFixed(1) + ' كم';
}

/* مولّد أرقام عشوائية ثابت (نفس البذرة = نفس الخريطة كل مرة) */
export function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* تخزين محلي آمن (ممكن يكون مقفول في بعض المتصفحات) */
export const local = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
