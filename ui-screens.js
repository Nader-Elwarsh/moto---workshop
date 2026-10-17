/* الشاشات الكاملة: البداية، تقرير اليوم، نهاية اللعبة، والأكاديمية (الشق التعليمي) */
import { VERSION } from './config.js';
import { DEVICES, PARTS } from './data-devices.js';
import { esc, fmt } from './core-util.js';
import { S } from './game-state.js';
import { bestScore } from './game-day.js';
import { ui } from './ui-panels.js';

const $ = (id) => document.getElementById(id);
const show = (html) => { ui.modal = 'screen'; $('layer').innerHTML = `<div class="screen"><div class="screen-in">${html}</div></div>`; };
const bestCard = () => { const b = bestScore(); return b ? `<div class="card"><h2>أحسن نتيجة</h2><div>اليوم <b class="num">${b.day}</b> · تحصيل <b class="num">${fmt(b.income)}</b> جنيه</div></div>` : ''; };

export function showIntro() {
  show(`<div class="hero"><span class="stamp">وردية 9 ص – 5 م</span><h1>فني على الموتوسيكل</h1>
      <p>إنت فني صيانة أجهزة منزلية. الطلبات بتنزل على موبايلك، وإنت اللي بتسوق للقرى وتفحص وتصلّح وتحصّل.</p></div>
    <div class="card"><h2>إزاي تلعب</h2><ol class="steps">
      <li><b>اقبل الطلب</b> اللي بينزل فوق، فيتضاف لخط السير. السهم الأصفر بيوديك للوجهة.</li>
      <li><b>سوق:</b> اسحب صباعك في أي حتة على الخريطة. على الكمبيوتر الأسهم أو WASD. الأسفلت أسرع، والترعة بتبطّأك.</li>
      <li>لما توصل للعميل اضغط الزرار وافحص الجهاز، واختار القطعة الصح من دليل الأكواد.</li>
      <li>القطعة معاك؟ صلّح وحصّل. مش معاك؟ <b>وقّف الأمر على قطعة غيار</b> وخد عربون؛ الأمر يتجمد ووقت العميل يقف.</li>
      <li>في <b>الورشة</b> بتحمّل قطع وتسلّم العهدة للمحفظة. وما تنساش البنزين.</li>
    </ol></div>${bestCard()}
    <button class="btn big" data-act="begin">اطلع على الطريق</button>
    <button class="btn big ghost" data-act="academy">الأكاديمية — اتعلم الأعطال</button>
    <div class="ver">نسخة ${VERSION}</div>`);
}

export function showReport({ handed, carry }) {
  const st = S.stats, dr = S.rep - st.rep0;
  show(`<div class="hero"><span class="stamp">قفلنا الوردية</span><h1>تقرير اليوم ${S.day}</h1>
      <p>اتسلّمت العهدة (${fmt(handed)} ج) والمحفظة دلوقتي <b class="num">${fmt(S.wallet)}</b> جنيه.</p></div>
    <div class="card"><h2>ملخص خط السير</h2><div class="report">
      <div><small>تحصيلات نهائية</small><b class="num pos">${fmt(st.coll)}</b></div>
      <div><small>عرابين</small><b class="num pos">${fmt(st.deps)}</b></div>
      <div><small>أوامر اتقفلت</small><b class="num">${st.done}</b></div>
      <div><small>عملاء لغوا</small><b class="num">${st.cancelled}</b></div>
      <div><small>المسافة</small><b class="num">${st.km.toFixed(1)} كم</b></div>
      <div><small>بنزين</small><b class="num neg">${fmt(st.fuel)}</b></div>
    </div>
    <div class="kv"><span>التقييم: <b class="num ${dr >= 0 ? 'pos' : 'neg'}">${S.rep.toFixed(1)} (${dr >= 0 ? '+' : ''}${dr.toFixed(1)})</b></span>
      ${carry ? `<span>فيه ${carry} أمر مترحّل لبكرة.</span>` : ''}</div></div>
    <button class="btn big" data-act="next">ابدأ اليوم ${S.day + 1}</button>`);
}

export function showGameOver() {
  show(`<div class="hero"><span class="stamp">مقفول</span><h1>الورشة قفلت</h1>
      <p>تقييم العملاء نزل تحت النجمة. وصلت لليوم ${S.day} وحصّلت <b class="num">${fmt(S.total)}</b> جنيه.</p></div>
    ${bestCard()}<button class="btn big" data-act="restart">افتح الورشة من جديد</button>`);
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
    <button class="btn big" data-act="${S.phase === 'intro' ? 'home' : 'resume'}">${S.phase === 'intro' ? 'رجوع' : 'رجوع للعبة'}</button>`);
}
