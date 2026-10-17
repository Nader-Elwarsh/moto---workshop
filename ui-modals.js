/* النوافذ اللي بتطلع من تحت: أمر الشغل، الورشة، البنزينة */
import { BAL } from './config.js';
import { DEVICES, PARTS, partsOf } from './data-devices.js';
import { VILLAGES } from './data-world.js';
import { esc, fmt } from './core-util.js';
import { S, byNo, boxCount } from './game-state.js';
import { LABEL, priceOf, depositOf } from './game-orders.js';
import { canLoad, upgradeState, fuelCost } from './game-shop.js';
import { ui, updateAction, renderRoute } from './ui-panels.js';

const $ = (id) => document.getElementById(id);

function sheet(title, sub, body) {
  $('layer').innerHTML = `<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-h"><div><h3>${title}</h3>${sub ? `<div class="kv">${sub}</div>` : ''}</div>
    <button class="x" data-act="close" aria-label="إغلاق">×</button></div>${body}</div></div>`;
}

export function closeModal() {
  if (S.repair) return;
  ui.modal = null; $('layer').innerHTML = '';
  updateAction(true); renderRoute();
}

/* ---------- أمر الشغل ---------- */
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
      <div class="kv"><span>الحساب: <b class="num">${fmt(price)}</b> ج</span>${o.dep ? `<span>عربون مدفوع: <b class="num">${fmt(o.dep)}</b></span><span>الباقي: <b class="num">${fmt(price - o.dep)}</b></span>` : ''}</div>
      <button class="btn big good" data-act="repair" data-no="${no}">صلّح الجهاز وحصّل</button>`;
  } else if (o.status === 'progress') {
    body = `<div class="note">التشخيص: <b>${PARTS[o.part].name}</b> — مش معاك في الصندوق.</div>
      <button class="btn big amber" data-act="freeze" data-no="${no}">وقّف الأمر على قطعة غيار · خد عربون ${fmt(depositOf(o))} ج</button>
      <div class="kv"><span>الأمر هيتجمد ووقت العميل هيقف لحد ما ترجع بالقطعة من الورشة.</span></div>`;
  } else {
    body = `<div class="note blue">الأمر مجمد على <b>${PARTS[o.part].name}</b>. هات القطعة من الورشة وارجع.</div>
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
export function openWorkshop() {
  ui.modal = 'ws'; S.bike.v = 0;
  const needed = S.orders.filter((o) => o.status === 'frozen' && !(S.box[o.part] > 0)).map((o) => o.part);
  const boxList = Object.keys(S.box).filter((k) => S.box[k] > 0).map((k) =>
    `<button class="boxchip" data-act="unload" data-part="${k}" title="نزّل قطعة للمخزن">${PARTS[k].name} × ${S.box[k]} <b aria-hidden="true">−</b></button>`).join('') || '<span>الصندوق فاضي</span>';
  const groups = Object.keys(DEVICES).map((dk) => `<div class="shop-group">${DEVICES[dk].name}</div>` + partsOf(dk).map((k) => `
    <div class="shop-row"><div class="t"><b>${PARTS[k].name}${needed.includes(k) ? ' <span class="st" style="background:var(--frozen);color:#fff">أمر مجمد مستنيها</span>' : ''}</b>
      <small>معاك: <span class="num">${S.box[k] || 0}</span></small></div>
      <button class="btn sm" data-act="load" data-part="${k}" ${canLoad(k) ? '' : 'disabled'}>حمّل · <span class="num">${fmt(PARTS[k].cost)}</span></button></div>`).join('')).join('');
  const up = (key, sub) => {
    const u = BAL.upgrades[key], st = upgradeState(key);
    return `<div class="shop-row"><div class="t"><b>${u.name}</b><small>${sub}</small></div>
      ${st.done ? '<span class="st" style="background:var(--good);color:#fff">متركّب</span>' : `<button class="btn sm amber" data-act="upgrade" data-up="${key}" ${st.can ? '' : 'disabled'}><span class="num">${fmt(u.cost)}</span> ج</button>`}</div>`;
  };
  sheet('الورشة', `<span>المحفظة: <b class="num">${fmt(S.wallet)}</b> ج</span><span>الصندوق: <b class="num">${boxCount()}/${S.cap}</b></span>`,
    `<div><b>في الصندوق</b><div class="kv">اضغط على قطعة عشان تنزّلها للمخزن وتفضّي مكان.</div></div>
     <div class="boxline">${boxList}</div>
     <div class="card" style="padding:12px"><h2>طوّر العُدّة</h2>
       ${up('cap', `${S.cap} ← ${Math.min(S.cap + BAL.upgrades.cap.step, BAL.upgrades.cap.max)} قطع`)}
       ${up('fast', 'سرعة +' + Math.round((BAL.fastBonus - 1) * 100) + '%')}
       ${up('tank', `${S.tank} ← ${Math.min(S.tank + BAL.upgrades.tank.step, BAL.upgrades.tank.max)} لتر`)}
     </div>
     <div><b>حمّل قطع غيار على الموتوسيكل</b><div class="kv">بتتدفع من المحفظة.</div></div>${groups}
     <button class="btn big" data-act="close">اطلع على الطريق</button>`);
  updateAction(true);
}

/* ---------- البنزينة ---------- */
export function openGas() {
  ui.modal = 'gas'; S.bike.v = 0;
  const need = S.tank - S.fuel, cost = fuelCost();
  sheet('البنزينة', `<span>في التانك: <b class="num">${S.fuel.toFixed(1)}/${S.tank}</b> لتر</span>`,
    need < .1 ? '<div class="note">التانك مليان.</div><button class="btn big ghost" data-act="close">تمام</button>'
      : `<div class="kv"><span>محتاج <b class="num">${need.toFixed(1)}</b> لتر</span><span>الحساب <b class="num">${fmt(cost)}</b> ج</span><span>بيتدفع من العهدة الأول</span></div>
         <button class="btn big amber" data-act="refuel" ${S.custody + S.wallet < cost ? 'disabled' : ''}>فوّل التانك</button>
         <button class="btn big ghost" data-act="close">بعدين</button>`);
  updateAction(true);
}
