/* =========================================================
   إعدادات اللعبة — كل أرقام التوازن في مكان واحد.
   عايز تغيّر صعوبة أو سعر؟ عدّل هنا بس، من غير ما تلمس المنطق.
   ========================================================= */

export const VERSION = '0.3.0';

export const BAL = {
  ordersPerDay: 5,      // عدد أوامر الشغل اللي بتنزل الصبح
  mPerPx: 2.2,          // كل بكسل على الخريطة = 2.2 متر
  dayStart: 9 * 60,     // الوردية بتبدأ 9 الصبح (بالدقايق)
  minutesPerKm: 3,      // الموتوسيكل بياخد ~3 دقايق في الكيلو (سرعة قرى)
  visitFee: 80,         // كشف الزيارة (جنيه) — للورشة
  depositPartShare: 0.5,// العربون = نص تمن القطعة + الكشف
  fuelPrice: 15,        // سعر لتر البنزين
  kmPerLiter: 30,       // الموتوسيكل بيعمل 30 كيلو في اللتر

  start: { wallet: 2000, balance: 300, rep: 3, fuel: 6, tank: 10, boxCap: 6 },

  // المخزن الصبح: كل قطعة بتبقى موجودة بعدد عشوائي بين min و max
  store: { min: 0, max: 2 },

  speed: { road: 250, field: 135, water: 60, empty: 40 }, // بكسل/ث
  fastBonus: 1.22,

  rep: { wrongDiag: -0.2, done: 0.1, doneSameDay: 0.15, carriedOver: -0.1 },

  // التطوير بيتدفع من رصيدك إنت (مصنعيتك)
  upgrades: {
    cap:  { cost: 600,  step: 3, max: 15, name: 'صندوق أكبر' },
    fast: { cost: 1200, name: 'موتوسيكل أسرع' },
    tank: { cost: 400,  step: 5, max: 20, name: 'تانك أكبر' },
  },

  repairTime: (labor) => 2.2 + labor / 120,   // ثواني حقيقية للتصليح
  repairMinutes: (labor) => 20 + labor / 10,  // دقايق على ساعة اللعبة
};

// استهلاك البنزين لكل بكسل (محسوب من الكيلو/لتر)
BAL.fuelPerPx = BAL.mPerPx / 1000 / BAL.kmPerLiter;
