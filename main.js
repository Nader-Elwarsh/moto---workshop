/* =========================================================
   نقطة البداية: بتربط المنطق بالواجهة وبتشغّل الحلقة.
   كل زرار في الواجهة عليه data-act، والأفعال كلها في ACTIONS تحت.
   ========================================================= */
import { on } from './core-events.js';
import { play, unlock, toggleMute, isMuted } from './core-audio.js';
import { initInput, readInput, releaseJoy } from './core-input.js';
import { S, resetState } from './game-state.js';
import { accept, decline, diagnose, freezeForPart, startRepair } from './game-orders.js';
import { updateBike } from './game-bike.js';
import { startDay, tickDay } from './game-day.js';
import { handOverCustody, loadPart, unloadPart, buyUpgrade, refuel } from './game-shop.js';
import { initMap, drawFrame, snapCamera } from './render-map.js';
import { updateHud, hudHeight } from './ui-hud.js';
import { ui, renderRequest, renderRoute, togglePanel, updateLive } from './ui-panels.js';
import { openOrder, openWorkshop, openGas, closeModal, updateRepairBar } from './ui-modals.js';
import { showIntro, showReport, showGameOver, showAcademy } from './ui-screens.js';

const $ = (id) => document.getElementById(id);
const MUTE_ON = 'M3 9v6h4l5 5V4L7 9H3zm13.6 3 2.9-2.9-1.4-1.4-2.9 2.9-2.9-2.9-1.4 1.4 2.9 2.9-2.9 2.9 1.4 1.4 2.9-2.9 2.9 2.9 1.4-1.4z';
const MUTE_OFF = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z';

/* ---------- ربط الأحداث ---------- */
on('sound', play);
on('orders', () => { renderRequest(); renderRoute(); });
on('day:end', (sum) => { releaseJoy(); if (S.phase === 'over') showGameOver(); else showReport(sum); });

/* ---------- الأفعال ---------- */
function begin() { ui.modal = null; $('layer').innerHTML = ''; startDay(); snapCamera(); }

const ACTIONS = {
  begin,
  next: () => { S.day++; begin(); },
  restart: () => { resetState(); begin(); },
  home: showIntro,
  academy: (d) => showAcademy(d.dev),
  resume: closeModal,
  close: closeModal,
  scrim: (d, el, e) => { if (e.target === el) closeModal(); },

  accept: (d) => accept(+d.no),
  decline: (d) => decline(+d.no),
  target: (d) => { S.target = d.k === 'o' ? { k: 'o', no: +d.no } : { k: d.k }; renderRoute(); },
  arrive: (d) => (d.k === 'ws' ? (handOverCustody(), openWorkshop()) : d.k === 'gas' ? openGas() : openOrder(+d.no)),

  diagnose: (d) => { diagnose(+d.no, d.part); openOrder(+d.no); },
  freeze: (d) => { freezeForPart(+d.no); closeModal(); },
  repair: (d) => { startRepair(+d.no); openOrder(+d.no); },

  load: (d) => { loadPart(d.part); openWorkshop(); },
  unload: (d) => { unloadPart(d.part); openWorkshop(); },
  upgrade: (d) => { buyUpgrade(d.up); openWorkshop(); },
  refuel: () => { refuel(); closeModal(); },

  panel: togglePanel,
  mute: () => $('muteIco').setAttribute('d', toggleMute() ? MUTE_ON : MUTE_OFF),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  unlock();
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el.dataset, el, e);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.modal && ui.modal !== 'screen') closeModal();
  if ((e.key === 'Enter' || e.key === ' ') && !ui.modal && !$('actBtn').hidden) { $('actBtn').click(); e.preventDefault(); }
});

/* ---------- الحلقة ---------- */
let last = 0, routeTick = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  if (S.phase === 'play') {
    updateBike(dt, readInput());
    const openNo = ui.modal && ui.modal[0] === 'o' ? +ui.modal.slice(1) : null;
    const repairing = S.repair && S.repair.no;
    tickDay(dt, openNo);
    if (repairing && !S.repair) closeModal();   // التصليح خلص
    if (ui.modal && ui.modal[0] === 'o' && openNo && !['new', 'progress', 'frozen'].includes((S.orders.find((o) => o.no === openNo) || {}).status)) closeModal();
    updateRepairBar();
    updateHud(); updateLive();
    if ((routeTick += dt) > 1) { routeTick = 0; if (ui.panelOpen) renderRoute(); }
  }
  drawFrame(now, dt, { hudH: hudHeight(), topReserve: ui.reqVisible ? 100 : 0 });
}

/* ---------- البداية ---------- */
// أداة للمطوّر: افتح اللعبة بـ #debug عشان توصل للحالة من الـ console (window.S)
if (location.hash === '#debug') window.S = S;

function boot(data) {
  resetState(data && data.S);
  initMap($('map'));
  initInput($('map'), () => S.phase === 'play' && !ui.modal);
  $('muteIco').setAttribute('d', isMuted() ? MUTE_ON : MUTE_OFF);
  snapCamera();
  if (S.phase === 'play') { renderRequest(); renderRoute(); }
  else if (S.phase === 'report') { S.phase = 'play'; S.t = 1e9; }   // يعرض التقرير تاني
  else showIntro();
  updateHud();
  last = performance.now();
  requestAnimationFrame(frame);
}

// الحفاظ على حالة اللعبة لما الصفحة تتحدّث وهي مفتوحة (معاينة Claude)
window.claude?.hot?.snapshot?.(() => ({ S }));
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
