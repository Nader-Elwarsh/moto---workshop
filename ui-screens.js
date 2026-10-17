/* الشاشات الكاملة: البداية، تقفيل اليومية، والأكاديمية (الشق التعليمي) */
import { VERSION, BAL } from './config.js';
import { DEVICES, PARTS } from './data-devices.js';
import { esc, fmt } from './core-util.js';
import { S } from './game-state.js';
import { bestScore } from './game-day.js';
import { ui } from './ui-panels.js';

const $ = (id) => document.getElementById(id);
const show = (html) => { ui.modal = 'screen'; $('layer').innerHTML = `<div class="screen"><div class="screen-in">${html}</div></div>`; };
const bestCard = () => { const b = bestScore(); return b ? `<div class="card"><h2>أحسن نتيجة</h2><div>اليوم <b class="num">${b.day}</b> · تحصيل <b class="num">${fmt(b.income)}</b> جنيه</div></div>` : ''; };

export function showIntro() {
  show(`<div class="hero"><span class="stamp">يوم شغل</span><h1>فني على الموتوسيكل</h1>
      <p>إنت فني صيانة أجهزة منزلية. كل يوم بتنزل الورشة تلاقي أوامر الشغل، وتاخد قطعك وتلف على العملاء براحتك.</p></div>
    <div class="card"><h2>يومك ماشي إزاي</h2><ol class="steps">
      <li><b>في الورشة:</b> هتلاقي ${BAL.ordersPerDay} أوامر شغل. رتّب خط السير بالأسهم.</li>
      <li><b>المخزن:</b> خد القطع اللي متوقع تحتاجها حسب الأكواد. الصندوق ليه سعة.</li>
      <li><b>سوق:</b> اسحب صباعك في أي حتة على الخريطة (أو الأسهم على الكمبيوتر). السهم الأصفر بيوديك للوجهة.</li>
      <li><b>عند العميل:</b> افحص واختار القطعة الصح. معاك؟ صلّح وحصّل. مش معاك؟ وقّف الأمر على قطعة وخد عربون.</li>
      <li><b>آخر اليوم:</b> ارجع الورشة وقفّل اليومية: العهدة للورشة، والمصنعية ليك. منها تطوّر الموتوسيكل.</li>
    </ol><div class="kv"><span>مفيش وقت بيخلص ولا عميل بيزهق. خد وقتك، بس خلي بالك من البنزين.</span></div></div>
    ${bestCard()}
    <button class="btn big" data-act="begin">انزل الورشة</button>
    <button class="btn big ghost" data-act="academy">الأكاديمية — اتعلم الأعطال</button>
    <div class="ver">نسخة ${VERSION}</div>`);
}

export function showReport({ handed, labor, open }) {
  const st = S.stats, dr = S.rep - st.rep0;
  show(`<div class="hero"><span class="stamp">تقفيل اليومية</span><h1>يوم ${S.day} خلص</h1>
      <p>سلّمت العهدة <b class="num">${fmt(handed)}</b> ج، وخدت مصنعيتك <b class="num">${fmt(labor)}</b> ج. رصيدك دلوقتي <b class="num">${fmt(S.balance)}</b> ج.</p></div>
    <div class="card"><h2>حساب اليوم</h2><div class="bill">
      <div><span>تحصيلات من العملاء</span><b class="num">${fmt(st.coll)}</b></div>
      <div><span>عرابين</span><b class="num">${fmt(st.deps)}</b></div>
      <div><span>بنزين</span><b class="num">− ${fmt(st.fuel)}</b></div>
      <div class="tot"><span>العهدة اللي اتسلّمت</span><b class="num">${fmt(handed)}</b></div>
    </div>
    <div class="bill">
      <div><span>قطع غيار</span><b class="num">${fmt(st.parts)}</b></div>
      <div><span>كشوفات</span><b class="num">${fmt(st.visits)}</b></div>
      <div class="tot pos"><span>مصنعيتك</span><b class="num">${fmt(labor)} ج</b></div>
    </div></div>
    <div class="card"><div class="report">
      <div><small>أوامر خلصت</small><b class="num">${st.done}</b></div>
      <div><small>مترحّلة لبكرة</small><b class="num">${open}</b></div>
      <div><small>المسافة</small><b class="num">${st.km.toFixed(1)} كم</b></div>
      <div><small>التقييم</small><b class="num ${dr >= 0 ? 'pos' : 'neg'}">${S.rep.toFixed(1)} (${dr >= 0 ? '+' : ''}${dr.toFixed(1)})</b></div>
    </div></div>
    <button class="btn big" data-act="next">ابدأ يوم ${S.day + 1}</button>`);
}

/* الأكاديمية: أول لبنة في الشق التعليمي. بتقرا من نفس بيانات الأعطال
   اللي اللعبة بتستخدمها، فأي عطل يتضاف في data-devices.js يظهر هنا. */
export function showAcademy(dev) {
  const keys = Object.keys(DEVICES), cur = dev || keys[0], d = DEVICES[cur];
  show(`<div class="hero"><span class="stamp">مرجع الفني</span><h1>الأكاديمية</h1>
      <p>أكواد الأعطال، أسبابها، وخطوات الفحص. المحتوى ده عيّنة مبدئية ومحتاج مراجعة فني.</p></div>
    <div class="tabs">${keys.map((k) => `<button class="tab ${k === cur ? 'on' : ''}" data-act="academy" data-dev="${k}">${DEVICES[k].name}</button>`).join('')}</div>
    ${d.faults.map((f) => `<div class="card lesson">
      <div class="lesson-h"><span class="code">${esc(f.code)}</span><div><b>${esc(f.sym)}</b><small>القطعة: ${PARTS[f.part].name}</small></div></div>
      <p>${esc(f.cause)}</p>
      <ol class="steps">${f.check.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`).join('')}
    <button class="btn big" data-act="home">رجوع</button>`);
}
