/* الشريط العلوي + الرسائل القصيرة */
import { BAL } from './config.js';
import { fmt } from './core-util.js';
import { on } from './core-events.js';
import { S } from './game-state.js';
import { clockText } from './game-day.js';

const $ = (id) => document.getElementById(id);

export function updateHud() {
  $('hClock').textContent = clockText();
  $('hBar').style.width = Math.min(100, S.t / BAL.dayLen * 100) + '%';
  $('hDay').textContent = S.day;
  $('hCust').textContent = fmt(S.custody);
  $('hWallet').textContent = fmt(S.wallet);
  const f = S.fuel / S.tank;
  $('hFuel').style.width = f * 100 + '%';
  $('hFuel').style.background = f < .2 ? 'var(--bad)' : 'var(--amber)';
  $('hStars').querySelector('.fg').style.width = (S.rep / 5 * 100) + '%';
  $('hStars').title = S.rep.toFixed(1) + ' من 5';
}

export function hudHeight() {
  return $('hud').offsetHeight + (parseFloat(getComputedStyle(document.documentElement).paddingTop) || 0);
}

export function toast(msg, kind = '') {
  const box = $('toasts'), el = document.createElement('div');
  el.className = 'toast ' + kind; el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2600);
  while (box.children.length > 3) box.firstChild.remove();
}

on('toast', ({ msg, kind }) => toast(msg, kind));
