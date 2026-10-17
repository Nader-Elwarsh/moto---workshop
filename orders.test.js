/* اختبارات منطق أوامر الشغل — بتشتغل بـ: npm test */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { S, resetState } from './game-state.js';
import { createRequest, accept, decline, diagnose, freezeForPart, startRepair, finishRepair,
  tickOrders, canMove, priceOf, depositOf } from './game-orders.js';
import { PARTS, DEVICES } from './data-devices.js';

beforeEach(() => { resetState(); S.phase = 'play'; S.stats = { done: 0, cancelled: 0, coll: 0, deps: 0, km: 0, fuel: 0, rep0: S.rep }; });

const wrongPart = (o) => Object.keys(PARTS).find((k) => PARTS[k].dev === o.dev && k !== o.part);

test('دورة الحالات مطابقة لنظام الورشة', () => {
  assert.ok(canMove('req', 'new'));
  assert.ok(canMove('new', 'progress'));
  assert.ok(canMove('progress', 'frozen'));
  assert.ok(canMove('frozen', 'progress'));
  assert.ok(canMove('progress', 'done'));
  assert.ok(!canMove('done', 'progress'), 'المكتمل مايرجعش');
  assert.ok(!canMove('new', 'done'), 'مفيش إغلاق من غير تنفيذ');
});

test('قبول طلب بيحطه في خط السير وبيسجل التغيير', () => {
  const o = createRequest();
  accept(o.no);
  assert.equal(o.status, 'new');
  assert.equal(o.log.length, 1);
  assert.deepEqual(S.target, { k: 'o', no: o.no });
});

test('الاعتذار عن طلب', () => {
  const o = createRequest(); decline(o.no);
  assert.equal(o.status, 'declined');
});

test('التشخيص الغلط بينزّل التقييم ومابيغيرش الحالة', () => {
  const o = createRequest(); accept(o.no);
  const rep = S.rep;
  assert.equal(diagnose(o.no, wrongPart(o)), false);
  assert.equal(o.status, 'new');
  assert.ok(S.rep < rep);
});

test('القطعة مش معاك ← تجميد + عربون في العهدة', () => {
  const o = createRequest(); accept(o.no);
  S.box = {};
  diagnose(o.no, o.part);
  freezeForPart(o.no);
  assert.equal(o.status, 'frozen');
  assert.equal(o.dep, depositOf(o));
  assert.equal(S.custody, o.dep);
});

test('الأمر المجمد صبر العميل فيه مابيقلّش', () => {
  const o = createRequest(); accept(o.no); S.box = {};
  diagnose(o.no, o.part); freezeForPart(o.no);
  const p = o.pat; tickOrders(30, null);
  assert.equal(o.pat, p);
});

test('تصليح بعد التجميد بيحصّل الباقي بس', () => {
  const o = createRequest(); accept(o.no); S.box = {};
  diagnose(o.no, o.part); freezeForPart(o.no);
  S.box[o.part] = 1;
  startRepair(o.no); finishRepair();
  assert.equal(o.status, 'done');
  assert.equal(S.custody, priceOf(o), 'العربون + الباقي = الحساب كامل');
  assert.equal(S.box[o.part], 0);
});

test('العميل بيلغي لما صبره يخلص', () => {
  const o = createRequest(); accept(o.no);
  tickOrders(o.patMax + 1, null);
  assert.equal(o.status, 'cancelled');
});

test('كل عطل بيشاور على قطعة موجودة لنفس الجهاز', () => {
  for (const [dk, d] of Object.entries(DEVICES)) for (const f of d.faults) {
    assert.ok(PARTS[f.part], `${dk}/${f.code}: القطعة ${f.part} مش موجودة`);
    assert.equal(PARTS[f.part].dev, dk);
    assert.ok(f.cause && f.check?.length, `${dk}/${f.code}: ناقص محتوى تعليمي`);
  }
});
