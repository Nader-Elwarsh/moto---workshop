# فني على الموتوسيكل 🏍️

لعبة إدارة صيانة أجهزة منزلية مستوحاة من نظام **الورشة الفنية**. إنت فني بتستلم أوامر شغل على موبايلك، وبتسوق الموتوسيكل للقرى على خط السير، وبتفحص وتصلّح أو بتوقّف الأمر على قطعة غيار، وبتحصّل العربون والتحصيل النهائي.

المشروع فيه شق تعليمي (**الأكاديمية**): أكواد الأعطال وأسبابها وخطوات الفحص. بيقرا من نفس بيانات اللعبة، فأي عطل جديد بيتضاف مرة واحدة ويظهر في المكانين.

> النسخة الحالية: **0.1.1** — الأساس اللي هنبني عليه. شوف [ROADMAP.md](ROADMAP.md).

## تشغيلها

المشروع **مش محتاج build**. ملفات HTML وCSS وJavaScript عادية (ES modules).

| الطريقة | إزاي |
|---|---|
| أونلاين | بعد ما يترفع على GitHub ويتربط بـ Cloudflare Pages (شوف [WORKFLOW.md](WORKFLOW.md)) |
| على الكمبيوتر | `npm run dev` وافتح `http://localhost:5173` |
| ملف واحد للمعاينة | `npm run bundle` بيطلع `dist/game.html` |

> فتح `index.html` بالدبل كليك مش هيشتغل، لأن المتصفح بيمنع الـ modules من `file://`. لازم سيرفر (أي واحدة من الطرق اللي فوق).

## خريطة الملفات

كل الملفات في مكان واحد من غير فولدرات (أسهل في الرفع من الموبايل). أول كلمة في اسم الملف بتقولك هو تبع أنهي جزء:

| البادئة | الدور | أمثلة |
|---|---|---|
| — | البداية والإعدادات | `index.html`، `main.js`، ⚙️ `config.js` (كل الأسعار والصعوبة) |
| `data-` | 📚 المحتوى | `data-devices.js` (الأجهزة والأعطال والقطع)، `data-world.js` (الخريطة) |
| `game-` | 🧠 المنطق (من غير DOM) | `game-orders.js` (أوامر الشغل)، `game-day.js` (الوردية) |
| `render-` | 🎨 الرسم | `render-map.js` |
| `ui-` | 🪟 الواجهة | `ui-panels.js`، `ui-modals.js`، `ui-screens.js` |
| `core-` | 🔧 أدوات عامة | `core-events.js`، `core-audio.js`، `core-input.js` |
| `style-` | 🎨 التنسيق | `style-tokens.css` (الألوان)، `style-app.css` |
| `tool-` | أدوات المطوّر | `tool-check.mjs`، `tool-bundle.mjs` |
| `*.test.js` | ✅ الاختبارات | `orders.test.js` |
| `*.md` | 📄 الوثائق | `GAME-DESIGN.md`، `ROADMAP.md`، `WORKFLOW.md`، `ARCHITECTURE.md` |

الاستثناء الوحيد: `.github/workflows/ci.yml` (الفحص التلقائي). GitHub بيدوّر عليه في المكان ده بالظبط.

## أوامر سريعة

```bash
npm test          # الاختبارات
npm run check     # فحص إن كل الملفات سليمة
npm run dev       # تشغيل محلي
npm run bundle    # ملف HTML واحد في dist/
```

لو فتحت اللعبة ورابطها آخره `#debug`، حالة اللعبة كلها بتبقى متاحة في الـ console باسم `S`.

## الوثائق

- [GAME-DESIGN.md](GAME-DESIGN.md) — فكرة اللعبة وقواعدها (المرجع لأي قرار)
- [ROADMAP.md](ROADMAP.md) — المراحل الجاية
- [WORKFLOW.md](WORKFLOW.md) — إزاي بنرفع ونعدّل ونجرّب
- [ARCHITECTURE.md](ARCHITECTURE.md) — إزاي الكود متقسّم ولو عايز تضيف حاجة تحطها فين
- [CHANGELOG.md](CHANGELOG.md) — سجل التغييرات
