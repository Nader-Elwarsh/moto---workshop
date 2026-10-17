/* لوحة خط السير تحت + زرار الفعل لما توصل لمكان */
import { BAL } from './config.js';
import { DEVICES, PARTS } from './data-devices.js';
import { WORKSHOP, GAS, VILLAGES } from './data-world.js';
import { esc, km, dist } from './core-util.js';
import { S, byNo } from './game-state.js';
import { isActive, routeOrders, LABEL } from './game-orders.js';
import { targetPos } from './render-map.js';
import { hudHeight } from './ui-hud.js';

const $ = (id) => document.getElementById(id);
export const ui = { panelOpen: false, modal: null, wsTab: 'orders' };

/* ---------- خط السير ---------- */
export const STATUS_COLOR = { new: ['var(--amber)', '#1c1404'], progress: ['var(--amber)', '#1c1404'], frozen: ['var(--frozen)', '#fff'] };

export function stopNote(o) {
  const have = S.box[o.part] > 0;
  if (o.status === 'frozen') return have ? 'القطعة معاك ✓ — روح صلّح' : 'مستني ' + PARTS[o.part].name + ' من المخزن';
  if (o.status === 'progress') return PARTS[o.part].name + (have ? ' · معاك ✓' : ' · مش معاك');
  return 'محتاج فحص';
}

/* صف أمر في أي قائمة (خط السير أو لوحة الورشة) مع أسهم الترتيب */
export function orderRow(o, i, n, { on = false, act = 'target' } = {}) {
  const c = STATUS_COLOR[o.status];
  return `<div class="stop ${on ? 'on' : ''}">
    <button class="stop-main" data-act="${act}" data-k="o" data-no="${o.no}">
      <span class="n" style="background:${c[0]};color:${c[1]}">${i + 1}</span>
      <span class="t"><b>#${o.no} ${esc(o.cust)} · ${esc(VILLAGES[o.vi].name)}</b>
        <small>${DEVICES[o.dev].name} ${esc(o.brand)} · <span class="code-sm">${esc(o.code)}</span> ${esc(o.sym)}</small>
        <small>${o.status === 'new' ? '' : LABEL[o.status] + ' · '}${stopNote(o)}${o.day < S.day ? ' · مترحّل من امبارح' : ''}</small></span>
    </button>
    <span class="ord">
      <button class="arrow" data-act="up" data-no="${o.no}" ${i === 0 ? 'disabled' : ''} aria-label="قدّم">▲</button>
      <button class="arrow" data-act="down" data-no="${o.no}" ${i === n - 1 ? 'disabled' : ''} aria-label="أخّر">▼</button>
    </span></div>`;
}

export function renderRoute() {
  const t = S.target, list = routeOrders();
  const isOn = (k, no) => !!(t && t.k === k && (!no || t.no === no));
  $('stops').innerHTML = (list.length ? list.map((o, i) => orderRow(o, i, list.length, { on: isOn('o', o.no) })).join('')
    : '<div class="empty-note">خلّصت كل أوامر النهارده 👏 ارجع الورشة قفّل اليومية.</div>') + `
    <div class="stop ${isOn('ws') ? 'on' : ''}"><button class="stop-main" data-act="target" data-k="ws"><span class="n" style="background:var(--navy);color:var(--on-navy)">و</span><span class="t"><b>الورشة</b><small>المخزن · التطوير · تقفيل اليومية</small></span></button></div>
    <div class="stop ${isOn('gas') ? 'on' : ''}"><button class="stop-main" data-act="target" data-k="gas"><span class="n" style="background:var(--bad)">ب</span><span class="t"><b>البنزينة</b><small>${BAL.fuelPrice} ج اللتر</small></span></button></div>`;
}

export function togglePanel() {
  ui.panelOpen = !ui.panelOpen;
  $('panel').classList.toggle('open', ui.panelOpen);
  $('panelToggle').setAttribute('aria-expanded', ui.panelOpen);
  if (ui.panelOpen) renderRoute();
}

/* أجزاء بتتحدث كل فريم */
export function updateLive() {
  const tg = targetPos(), t = S.target;
  const left = routeOrders().length;
  $('routeLbl').textContent = left ? `خط السير · فاضل ${left}` : 'خط السير · خلصت';
  if (tg) {
    const o = t.k === 'o' ? byNo(t.no) : null;
    $('tgtName').textContent = o ? `#${o.no} ${o.cust} · ${VILLAGES[o.vi].name}` : tg.name;
    $('tgtDist').textContent = km(dist(S.bike, tg));
  } else {
    $('tgtName').textContent = left ? 'اختار وجهة من خط السير' : 'ارجع الورشة';
    $('tgtDist').textContent = '';
  }
  updateAction();
}

/* ---------- زرار "وصلت" ---------- */
let actKey = '';
function nearest() {
  const b = S.bike;
  if (dist(b, WORKSHOP) < 85) return { k: 'ws', label: 'ادخل الورشة' };
  if (dist(b, GAS) < 60) return { k: 'gas', label: 'فوّل بنزين' };
  for (const o of S.orders) if (isActive(o) && dist(b, o) < 55) return { k: 'o', no: o.no, label: `افتح أمر #${o.no} · ${o.cust.split(' ')[0]}` };
  return null;
}
export function updateAction(force) {
  const n = S.phase === 'play' && !ui.modal ? nearest() : null;
  const key = n ? n.k + (n.no || '') : '';
  if (key === actKey && !force) return;
  actKey = key;
  const a = $('actBtn'); a.hidden = !n;
  if (n) { a.textContent = n.label; a.dataset.k = n.k; a.dataset.no = n.no || ''; }
}
export { hudHeight };
