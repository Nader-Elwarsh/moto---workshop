import { local } from './core-util.js';

let ctx = null;
let muted = local.get('mw-muted', false);

const SEQ = {
  coin: [[880, .07], [1320, .12]],
  bad: [[220, .18]],
  ping: [[988, .06], [1318, .09]],
  start: [[440, .06], [660, .08]],
  bell: [[1046, .1], [784, .1], [1046, .2]],
  horn: [[392, .12], [392, .16]],
};

export const isMuted = () => muted;
export function toggleMute() { muted = !muted; local.set('mw-muted', muted); return muted; }
export function unlock() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

export function play(kind) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    let at = ctx.currentTime;
    const square = kind === 'bad' || kind === 'horn';
    for (const [f, d] of SEQ[kind] || [[600, .05]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = square ? 'square' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(kind === 'horn' ? .06 : .11, at);
      g.gain.exponentialRampToValueAtTime(.001, at + d);
      o.connect(g).connect(ctx.destination);
      o.start(at); o.stop(at + d);
      at += d * .9;
    }
  } catch { /* الصوت اختياري */ }
}
