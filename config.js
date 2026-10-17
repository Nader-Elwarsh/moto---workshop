/* =========================================================
   إعدادات اللعبة — كل أرقام التوازن في مكان واحد.
   عايز تغيّر صعوبة أو سعر؟ عدّل هنا بس، من غير ما تلمس المنطق.
   ========================================================= */

export const VERSION = '0.1.1';

export const BAL = {
  dayLen: 210,          // طول الوردية بالثواني الحقيقية (9 ص → 5 م)
  mPerPx: 2.2,          // كل بكسل على الخريطة = 2.2 متر
  visitFee: 80,         // كشف الزيارة (جنيه)
  depositPartShare: 0.5,// العربون = نص تمن القطعة + الكشف
  fuelPrice: 15,        // سعر لتر البنزين
  fuelPerPx: 1 / 850,   // استهلاك البنزين لكل بكسل

  start: { wallet: 1200, rep: 3, fuel: 8, tank: 10, boxCap: 6 },
  startBox: { valve: 1, lock: 1, drain: 1, sensor: 1, spark: 1, capacitor: 1 },

  speed: { road: 250, field: 135, water: 60, empty: 40 }, // بكسل/ث
  fastBonus: 1.22,

  requests: {
    expire: 22,          // الطلب الوارد بيفوت بعد كام ثانية
    maxActive: 8,        // أقصى عدد أوامر مفتوحة في نفس الوقت
    firstAt: 3,
    gap: (day) => Math.max(7, 17 - day * 1.6), // متوسط الوقت بين الطلبات
    patience: (day, rep) => Math.max(75, 140 - day * 9) + (rep - 3) * 6,
  },

  rep: { wrongDiag: -0.2, cancel: -0.4, missed: -0.05, happy: 0.2, ok: 0.1, gameOverBelow: 1 },

  upgrades: {
    cap:  { cost: 700,  step: 3, max: 15, name: 'صندوق أكبر' },
    fast: { cost: 1400, name: 'موتوسيكل أسرع' },
    tank: { cost: 500,  step: 5, max: 20, name: 'تانك أكبر' },
  },

  repairTime: (labor) => 2.2 + labor / 120,
};
