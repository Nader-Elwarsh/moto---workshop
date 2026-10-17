/* اختبارات منطق اللعبة — بتشتغل بـ: npm test */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BAL } from './config.js';
import { S, resetState } from './game-state.js';
import { diagnose, freezeForPart, startRepair, finishRepair, canMove, priceOf, depositOf, laborOf,
  routeOrders, moveInRoute, nextStop } from './game-orders.js';
import { startDay, closeDay } from './game-day.js';
import { takePart, returnPart, canTake } from './game-shop.js';
import { PARTS, DEVICES } from './data-devices.js';

const wrongPart = (o) => Object.keys(PARTS).find((k) => PARTS[k].dev === o.dev && k !== o.part);
const repairNow = (o) => { startRepair(o.no); finishRepair(); };

beforeEach(() => { resetState(); startDay(); });

test('اليوم بيبدأ بعدد الأوامر المظبوط في خط السير', () => {
  assert.equal(routeOrders().length, BAL.ordersPerDay);
  assert.ok(routeOrders().every((o) => o.status === 'new'));
  assert.equal(S.clock, BAL.dayStart);
});

test('دورة الحالات مطابقة لنظام الورشة', () => {
  assert.ok(canMove('new', 'progress'));
  assert.ok(canMove('progress', 'frozen'));
  assert.ok(canMove('frozen', 'progress'));
  assert.ok(canMove('progress', 'done'));
  assert.ok(!canMove('done', 'progress'), 'المكتمل مايرجعش');
  assert.ok(!canMove('new', 'done'), 'مفيش إغلاق من غير فحص');
});

test('ترتيب خط السير', () => {
  const [a, b] = routeOrders();
  moveInRoute(b.no, -1);
  assert.equal(routeOrders()[0].no, b.no);
  assert.equal(routeOrders()[1].no, a.no);
  moveInRoute(b.no, -1);  // أول واحد مايطلعش أكتر
  assert.equal(routeOrders()[0].no, b.no);
});

test('المخزن: خد ورجّع، والصندوق ليه سعة', () => {
  const k = Object.keys(PARTS)[0];
  S.store[k] = 20; S.box = {};
  for (let i = 0; i < S.cap; i++) assert.ok(takePart(k));
  assert.ok(!canTake(k), 'الصندوق اتملى');
  assert.ok(returnPart(k));
  assert.equal(S.box[k], S.cap - 1);
  assert.equal(S.store[k], 20 - S.cap + 1);
});

test('التشخيص الغلط بينزّل التقييم ومابيغيرش الحالة', () => {
  const o = routeOrders()[0], rep = S.rep;
  assert.equal(diagnose(o.no, wrongPart(o)), false);
  assert.equal(o.status, 'new');
  assert.ok(S.rep < rep);
});

test('تصليح بالقطعة: الحساب كامل في العهدة والمصنعية تتسجل', () => {
  const o = routeOrders()[0];
  S.box = { [o.part]: 1 };
  diagnose(o.no, o.part); repairNow(o);
  assert.equal(o.status, 'done');
  assert.equal(S.custody, priceOf(o));
  assert.equal(S.stats.labor, laborOf(o));
  assert.equal(S.box[o.part], 0);
  assert.ok(S.clock > BAL.dayStart, 'التصليح بياخد وقت');
});

test('القطعة مش معاك ← تجميد + عربون، وبعد ما تجيبها تحصّل الباقي بس', () => {
  const o = routeOrders()[0];
  S.box = {};
  diagnose(o.no, o.part); freezeForPart(o.no);
  assert.equal(o.status, 'frozen');
  assert.equal(S.custody, depositOf(o));
  S.box[o.part] = 1;
  repairNow(o);
  assert.equal(o.status, 'done');
  assert.equal(S.custody, priceOf(o), 'العربون + الباقي = الحساب كامل');
});

test('الوجهة الجاية بتعدّي الأمر المجمد لو قطعته مش معاك', () => {
  const [a, b] = routeOrders();
  S.box = {};
  diagnose(a.no, a.part); freezeForPart(a.no);
  assert.equal(nextStop().no, b.no);
  S.box[a.part] = 1;
  assert.equal(nextStop().no, a.no);
});

test('تقفيل اليومية: العهدة للورشة ناقص المصنعية، والمصنعية لرصيدك، والقطع ترجع', () => {
  const o = routeOrders()[0];
  S.box = { [o.part]: 2 };
  diagnose(o.no, o.part); repairNow(o);
  const wallet = S.wallet, balance = S.balance, custody = S.custody, storeBefore = S.store[o.part] || 0;
  const sum = closeDay();
  assert.equal(sum.labor, laborOf(o));
  assert.equal(S.balance, balance + laborOf(o));
  assert.equal(S.wallet, wallet + custody - laborOf(o));
  assert.equal(S.custody, 0);
  assert.equal(S.box[o.part], 0);
  assert.equal(S.store[o.part], storeBefore + 1, 'القطعة الزيادة رجعت المخزن');
  assert.equal(sum.open, BAL.ordersPerDay - 1);
});

test('الأوامر المفتوحة بتترحّل لليوم الجاي، والمجمد قطعته بتوصل المخزن', () => {
  const o = routeOrders()[0];
  S.box = {}; S.store[o.part] = 0;
  diagnose(o.no, o.part); freezeForPart(o.no);
  closeDay(); S.day++; startDay();
  assert.equal(routeOrders().length, BAL.ordersPerDay * 2);
  assert.ok(routeOrders().some((x) => x.no === o.no && x.status === 'frozen'));
  assert.ok(S.store[o.part] >= 1, 'القطعة وصلت المخزن');
});

test('كل عطل بيشاور على قطعة موجودة لنفس الجهاز', () => {
  for (const [dk, d] of Object.entries(DEVICES)) for (const f of d.faults) {
    assert.ok(PARTS[f.part], `${dk}/${f.code}: القطعة ${f.part} مش موجودة`);
    assert.equal(PARTS[f.part].dev, dk);
    assert.ok(f.cause && f.check?.length, `${dk}/${f.code}: ناقص محتوى تعليمي`);
  }
});
