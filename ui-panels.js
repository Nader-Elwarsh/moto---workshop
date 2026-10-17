/* كارت الطلب الوارد + لوحة خط السير + زرار الفعل لما توصل لمكان */
import { BAL } from './config.js';
import { DEVICES, PARTS } from './data-devices.js';
import { WORKSHOP, GAS, VILLAGES } from './data-world.js';
import { esc, km, dist } from './core-util.js';
import { S, byNo } from './game-state.js';
import { isActive } from './game-orders.js';
import { targetPos } from './render-map.js';
import { hudHeight } from './ui-hud.js';

const $ = (id) => document.getElementById(id);
export const ui = { reqVisible: false, panelOpen: false, modal: null };

/* ---------- الطلب الوارد ---------- */
export function renderRequest() {
  const reqs = S.orders.filter((o) => o.status === 'req');
  ui.reqVisible = reqs.length > 0 && S.phase === 'play';
  if (!ui.reqVisible) { $('reqSlot').innerHTML = ''; return; }
  const o = reqs[0];
  $('reqSlot').innerHTML = `<div class="req" style="top:calc(env(safe-area-inset-top,0px) + ${$('hud').offsetHeight + 8}px)" role="alert">
    <div class="req-h"><b>طلب صيانة جديد #${o.no}</b><span>${esc(VILLAGES[o.vi].name)} · ${km(dist(S.bike, o))}</span>${reqs.length > 1 ? `<span class="cnt num">+${reqs.length - 1}</span>` : ''}</div>
    <div class="req-body"><span class="code">${esc(o.code)}</span>
      <span class="t"><b>${DEVICES[o.dev].name} ${esc(o.brand)} — ${esc(o.sym)}</b>${esc(o.cust)}</span>
      <button class="btn ghost sm" data-act="decline" data-no="${o.no}">اعتذر</button>
      <button class="btn amber sm" data-act="accept" data-no="${o.no}">قبول</button></div>
    <div class="rbar"><i id="reqBar"></i></div></div>`;
}

/* ---------- خط السير ---------- */
const STYLE = { new: ['var(--amber)', '#1c1404'], progress: ['var(--amber)', '#1c1404'], frozen: ['var(--frozen)', '#fff'] };
function stopNote(o) {
  if (o.status === 'frozen') return S.box[o.part] > 0 ? 'القطعة معاك ✓' : 'محتاج ' + PARTS[o.part].name + ' من الورشة';
  if (o.status === 'progress') return PARTS[o.part].name;
  return 'محتاج فحص';
}
export function renderRoute() {
  const t = S.target, list = S.orders.filter(isActive);
  const on = (k, no) => (t && t.k === k && (!no || t.no === no) ? 'on' : '');
  $('stops').innerHTML = list.map((o, i) => `
    <button class="stop ${on('o', o.no)}" data-act="target" data-k="o" data-no="${o.no}">
      <span class="n" style="background:${STYLE[o.status][0]};color:${STYLE[o.status][1]}">${i + 1}</span>
      <span class="t"><b>#${o.no} ${esc(o.cust)} · ${esc(VILLAGES[o.vi].name)}</b><small>${DEVICES[o.dev].name} ${esc(o.code)} · ${stopNote(o)}</small></span>
      ${o.status === 'frozen' ? '<span class="st" style="background:var(--frozen);color:#fff">مجمد</span>' : `<span class="pb"><i data-pat="${o.no}"></i></span>`}
    </button>`).join('') + `
    <button class="stop ${on('ws')}" data-act="target" data-k="ws"><span class="n" style="background:var(--navy);color:var(--on-navy)">و</span><span class="t"><b>الورشة</b><small>قطع غيار · تسليم العهدة · تطوير</small></span></button>
    <button class="stop ${on('gas')}" data-act="target" data-k="gas"><span class="n" style="background:var(--bad)">ب</span><span class="t"><b>البنزينة</b><small>${BAL.fuelPrice} ج اللتر</small></span></button>`;
}
export function togglePanel() {
  ui.panelOpen = !ui.panelOpen;
  $('panel').classList.toggle('open', ui.panelOpen);
  $('panelToggle').setAttribute('aria-expanded', ui.panelOpen);
  if (ui.panelOpen) renderRoute();
}

/* أجزاء بتتحدث كل فريم (أشرطة وأرقام) من غير ما نعيد بناء القوائم */
export function updateLive() {
  const req = S.orders.find((o) => o.status === 'req'), rb = $('reqBar');
  if (rb && req) rb.style.width = (req.exp / req.expMax * 100) + '%';
  for (const el of document.querySelectorAll('[data-pat]')) {
    const o = byNo(+el.dataset.pat); if (!o) continue;
    const f = Math.max(0, o.pat / o.patMax);
    el.style.width = f * 100 + '%';
    el.style.background = f > .5 ? 'var(--good)' : f > .25 ? 'var(--amber)' : 'var(--bad)';
  }
  const tg = targetPos(), t = S.target;
  if (tg) {
    const o = t.k === 'o' ? byNo(t.no) : null;
    $('tgtName').textContent = o ? `#${o.no} ${o.cust} · ${VILLAGES[o.vi].name}` : tg.name;
    $('tgtDist').textContent = km(dist(S.bike, tg));
  } else {
    $('tgtName').textContent = S.orders.some(isActive) ? 'اختار وجهة من خط السير' : 'مستني طلبات جديدة…';
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
