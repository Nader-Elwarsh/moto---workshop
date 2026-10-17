/* النوافذ اللي بتطلع من تحت: أمر الشغل، الورشة (أوامر / مخزن / تطوير)، البنزينة */
import { BAL } from './config.js';
import { DEVICES, PARTS, partsOf } from './data-devices.js';
import { VILLAGES } from './data-world.js';
import { esc, fmt } from './core-util.js';
import { S, byNo, boxCount } from './game-state.js';
import { LABEL, priceOf, depositOf, laborOf, routeOrders } from './game-orders.js';
import { canTake, neededParts, upgradeState, fuelCost } from './game-shop.js';
import { ui, updateAction, renderRoute, orderRow } from './ui-panels.js';
import { drawPlan } from './render-map.js';

const $ = (id) => document.getElementById(id);

function sheet(title, sub, body, cls = '') {
  $('layer').innerHTML = `<div class="scrim" data-act="scrim"><div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-h"><div><h3>${title}</h3>${sub ? `<div class="kv">${sub}</div>` : ''}</div>
    <button class="x" data-act="close" aria-label="إغلاق">×</button></div>${body}</div></div>`;
}

export function closeModal() {
  if (S.repair) return;
  ui.modal = null; $('layer').innerHTML = '';
  updateAction(true); renderRoute();
}

/* ---------- أمر الشغل عند العميل ---------- */
export function openOrder(no) {
  const o = byNo(no); if (!o) return closeModal();
  ui.modal = 'o' + no; S.bike.v = 0;
  const d = DEVICES[o.dev], have = S.box[o.part] || 0;
  let body;
  if (S.repair && S.repair.no === no) {
    body = `<div><b>جاري التصليح… ${PARTS[o.part].name}</b></div><div class="wbar"><i id="repBar"></i></div>`;
  } else if (o.status === 'new') {
    body = `<div><b style="font-size:14px">افحص الجهاز: إيه القطعة اللي فيها العطل؟</b></div>
      <div class="parts">${partsOf(o.dev).map((k) => `<button class="part" data-act="diagnose" data-part="${k}" data-no="${no}"><b>${PARTS[k].name}</b>
        <small class="${S.box[k] ? 'have' : ''}">${S.box[k] ? 'معاك في الصندوق: ' + S.box[k] : 'مش معاك'}</small></button>`).join('')}</div>
      <details class="guide" ${S.day === 1 ? 'open' : ''}><summary>دليل أكواد الأعطال — ${d.name}</summary>
      <table>${d.faults.map((f) => `<tr><td>${esc(f.code)}</td><td>${esc(f.sym)}</td><td>${PARTS[f.part].name}</td></tr>`).join('')}</table></details>`;
  } else if (have > 0) {
    const price = priceOf(o);
    body = `<div class="note">التشخيص: <b>${PARTS[o.part].name}</b> — القطعة معاك في الصندوق.</div>
      <div class="bill">
        <div><span>قطعة الغيار</span><b class="num">${fmt(PARTS[o.part].cost)}</b></div>
        <div><span>المصنعية (ليك)</span><b class="num">${fmt(laborOf(o))}</b></div>
        <div><span>الكشف</span><b class="num">${fmt(BAL.visitFee)}</b></div>
        ${o.dep ? `<div><span>عربون مدفوع</span><b class="num">− ${fmt(o.dep)}</b></div>` : ''}
        <div class="tot"><span>هتحصّل</span><b class="num">${fmt(price - o.dep)} ج</b></div>
      </div>
      <button class="btn big good" data-act="repair" data-no="${no}">صلّح الجهاز وحصّل</button>`;
  } else if (o.status === 'progress') {
    body = `<div class="note">التشخيص: <b>${PARTS[o.part].name}</b> — مش معاك في الصندوق.</div>
      <button class="btn big amber" data-act="freeze" data-no="${no}">وقّف الأمر على قطعة غيار · خد عربون ${fmt(depositOf(o))} ج</button>
      <div class="kv"><span>الأمر هيتجمد. لو القطعة في المخزن هاتها وارجع، أو هتوصل المخزن بكرة الصبح.</span></div>`;
  } else {
    body = `<div class="note blue">الأمر مجمد على <b>${PARTS[o.part].name}</b>. هاتها من المخزن وارجع.</div>
      <button class="btn big ghost" data-act="close">تمام</button>`;
  }
  sheet(`أمر شغل #${o.no}`, `<span>${esc(o.cust)}</span><span class="num">${o.phone}</span><span>${esc(VILLAGES[o.vi].name)}</span>`,
    `<div class="fault"><span class="code">${esc(o.code)}</span><div><p>${esc(o.sym)}</p>
      <div class="kv"><span>${d.name} ${esc(o.brand)}</span><span>${LABEL[o.status]}</span></div></div></div>${body}`);
  updateAction(true);
}

export function updateRepairBar() {
  const el = $('repBar'); if (el && S.repair) el.style.width = Math.min(100, S.repair.t / S.repair.max * 100) + '%';
}

/* ---------- الورشة ---------- */
const TABS = [['orders', 'أوامر النهارده'], ['store', 'المخزن'], ['upgrade', 'طوّر']];

export function openWorkshop(tab) {
  if (tab) ui.wsTab = tab;
  ui.modal = 'ws'; S.bike.v = 0;
  const tabs = `<div class="tabs">${TABS.map(([k, n]) => `<button class="tab ${ui.wsTab === k ? 'on' : ''}" data-act="wsTab" data-tab="${k}">${n}</button>`).join('')}</div>`;
  const body = ui.wsTab === 'store' ? storeTab() : ui.wsTab === 'upgrade' ? upgradeTab() : ordersTab();
  const left = routeOrders().length;
  sheet('الورشة', `<span>الصندوق: <b class="num">${boxCount()}/${S.cap}</b></span><span>رصيدك: <b class="num">${fmt(S.balance)}</b> ج</span><span>العهدة: <b class="num">${fmt(S.custody)}</b> ج</span>`,
    `${tabs}${body}
     <div class="ws-foot">
       <button class="btn big" data-act="close">اطلع على الطريق</button>
       <button class="btn big ghost" data-act="closeDay">${left ? `قفّل اليومية (فاضل ${left} أمر هيترحّل)` : 'قفّل اليومية وخد مصنعيتك'}</button>
     </div>`, 'ws');
  if (ui.wsTab === 'orders') requestAnimationFrame(() => drawPlan($('planMap'), S.target && S.target.k === 'o' ? S.target.no : null));
  updateAction(true);
}

function ordersTab() {
  const list = routeOrders();
  if (!list.length) return '<div class="note">مفيش أوامر مفتوحة. قفّل اليومية عشان تاخد مصنعيتك وتبدأ يوم جديد.</div>';
  return `<div class="plan"><canvas id="planMap" aria-label="خريطة أوامر النهارده"></canvas></div>
    <div class="kv"><span>اضغط على أمر عشان تشوفه على الخريطة. رتّب بالأسهم: اللي فوق هو أول وجهة.</span></div>
    <div class="list-box">${list.map((o, i) => orderRow(o, i, list.length, { act: 'pick', on: !!(S.target && S.target.no === o.no) })).join('')}</div>
    <button class="btn amber" data-act="wsTab" data-tab="store">افتح المخزن وخد القطع ←</button>`;
}

function storeTab() {
  const need = neededParts();
  const boxList = Object.keys(S.box).filter((k) => S.box[k] > 0).map((k) =>
    `<button class="boxchip" data-act="return" data-part="${k}" title="رجّعها المخزن">${PARTS[k].name} × ${S.box[k]} <b aria-hidden="true">−</b></button>`).join('') || '<span class="kv">الصندوق فاضي</span>';
  const row = (k) => {
    const n = need[k] || 0, inBox = S.box[k] || 0, stock = S.store[k] || 0;
    const tag = n ? `<span class="st ${inBox >= n ? 'ok' : stock ? 'need' : 'out'}">${inBox >= n ? 'جاهز ✓' : stock ? `محتاج ${n}` : 'مش في المخزن'}</span>` : '';
    const dev = n ? `<small>${DEVICES[PARTS[k].dev].name}</small>` : '';
    return `<div class="shop-row"><div class="t"><b>${PARTS[k].name} ${tag}</b>${dev}
      <small>في المخزن: <span class="num">${stock}</span> · معاك: <span class="num">${inBox}</span></small></div>
      <button class="btn sm" data-act="take" data-part="${k}" ${canTake(k) ? '' : 'disabled'}>${stock ? 'خد' : 'خلصانة'}</button></div>`;
  };
  const needed = Object.keys(need);
  const others = Object.keys(DEVICES).map((dk) => {
    const ks = partsOf(dk).filter((k) => !need[k]);
    return ks.length ? `<div class="shop-group">${DEVICES[dk].name}</div>` + ks.map(row).join('') : '';
  }).join('');
  return `<div><b>في الصندوق</b> <span class="kv">اضغط على قطعة عشان ترجّعها المخزن</span></div>
    <div class="boxline">${boxList}</div>
    <div class="card needed-box"><h2>قطع أوامر النهارده</h2>
      <div class="kv"><span>حسب أكواد الأعطال. الفحص عند العميل هو اللي بيأكد.</span></div>
      ${needed.length ? needed.map(row).join('') : '<div class="kv">مفيش.</div>'}</div>
    <details class="all-parts"><summary>باقي قطع المخزن</summary>${others}</details>`;
}

function upgradeTab() {
  const up = (key, sub) => {
    const u = BAL.upgrades[key], st = upgradeState(key);
    return `<div class="shop-row"><div class="t"><b>${u.name}</b><small>${sub}</small></div>
      ${st.done ? '<span class="st ok">متركّب</span>' : `<button class="btn sm amber" data-act="upgrade" data-up="${key}" ${st.can ? '' : 'disabled'}><span class="num">${fmt(u.cost)}</span> ج</button>`}</div>`;
  };
  return `<div class="kv"><span>التطوير بيتدفع من رصيدك (المصنعية اللي جمعتها).</span></div>
    ${up('cap', `${S.cap} ← ${Math.min(S.cap + BAL.upgrades.cap.step, BAL.upgrades.cap.max)} قطع`)}
    ${up('fast', 'سرعة +' + Math.round((BAL.fastBonus - 1) * 100) + '%')}
    ${up('tank', `${S.tank} ← ${Math.min(S.tank + BAL.upgrades.tank.step, BAL.upgrades.tank.max)} لتر`)}`;
}

/* ---------- البنزينة ---------- */
export function openGas() {
  ui.modal = 'gas'; S.bike.v = 0;
  const need = S.tank - S.fuel, cost = fuelCost();
  sheet('البنزينة', `<span>في التانك: <b class="num">${S.fuel.toFixed(1)}/${S.tank}</b> لتر</span><span>اللتر بيمشي ${BAL.kmPerLiter} كم</span>`,
    need < .1 ? '<div class="note">التانك مليان.</div><button class="btn big ghost" data-act="close">تمام</button>'
      : `<div class="kv"><span>محتاج <b class="num">${need.toFixed(1)}</b> لتر</span><span>الحساب <b class="num">${fmt(cost)}</b> ج</span><span>من العهدة الأول وبعدين من رصيدك</span></div>
         <button class="btn big amber" data-act="refuel" ${S.custody + S.balance < cost ? 'disabled' : ''}>فوّل التانك</button>
         <button class="btn big ghost" data-act="close">بعدين</button>`);
  updateAction(true);
}
