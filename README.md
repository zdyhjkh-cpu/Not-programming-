# Not Programming

منصة ويب بسيطة لتعليم البرمجة باللغة العربية — بدون أي إطار عمل (Vanilla JS) ومربوطة بالكامل بـ Firebase (تسجيل دخول، قاعدة بيانات لحظية، تخزين ملفات)، بالإضافة لمساعد ذكاء اصطناعي اختياري.

## ⚡ التجهيز السريع

### 1) في Firebase Console
- Authentication → Sign-in method → فعّل **Email/Password**
- Firestore Database → Create → **Production mode** → `eur3`
- Storage → Get started → **Production mode**

### 2) المعلم
إيميل المعلم مبرمج مسبقاً في `public/firebase.js`:

```js
export const TEACHER_EMAILS = ["email@example.com"];
```

أي حساب يسجّل بإيميل موجود في المصفوفة دي بيتحول تلقائياً لدور "معلم" (باقي الحسابات بتفضل "طالب"). تقدر تضيف أكتر من إيميل بالفاصلة.

> غيّر الإيميل قبل النشر، ولو غيّرته بعد ما الموقع اتنشر لازم تعمل ديبلوي تاني عشان التغيير يسري.

### 3) نشر الموقع (Firebase Hosting)
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```
الأمر ده بينشر الـ Hosting وقواعد Firestore (`firestore.rules`) وقواعد Storage (`storage.rules`) مرة واحدة، لأنها متسجلة أصلاً في `firebase.json`.

### 4) تفعيل المساعد الذكي (اختياري)
المساعد الذكي بيشتغل عن طريق Cloudflare Worker (`worker.js`) بيعمل proxy لطلبات Claude، عشان مفتاح الـ API ميبقاش ظاهر في كود المتصفح.

1. جهّز مفتاح Anthropic API.
2. انشر الـ Worker وسجّل المفتاح كـ secret:
   ```bash
   npm install -g wrangler
   wrangler deploy worker.js
   wrangler secret put ANTHROPIC_API_KEY
   ```
3. لو دومين الموقع مختلف عن اللي في الكود، حدّث قايمة `ALLOWED` جوه `worker.js`.
4. من لوحة المعلم → الإعدادات، حط رابط الـ Worker (شكله زي `https://xxx.workers.dev`) في خانة رابط الذكاء الاصطناعي واحفظ.

من غير الخطوة دي، باقي الموقع بيشتغل عادي وبس المساعد الذكي مش هيرد.

## 🗂️ هيكل المشروع
```
not-programming/
├─ public/
│  ├─ index.html           نقطة الدخول
│  ├─ app.js                الواجهة + الراوتر + كل الشاشات
│  ├─ firebase.js            الاتصال بـ Firebase وكل دوال القراءة/الكتابة
│  └─ styles.css             التنسيق
├─ worker.js                 Cloudflare Worker لعمل proxy لـ Claude
├─ firestore.rules            قواعد أمان قاعدة البيانات
├─ storage.rules              قواعد أمان تخزين الملفات
├─ firestore.indexes.json      الفهارس المطلوبة للاستعلامات
├─ firebase.json              إعدادات Firebase Hosting/Firestore/Storage
└─ .firebaserc                رقم مشروع Firebase
```

## ✨ المميزات
- تسجيل دخول/حساب بالإيميل وكلمة السر، مع تحديد الدور (طالب/معلم) تلقائي حسب الإيميل.
- عرض الكورسات والاشتراك فيها.
- رفع إشعار دفع (صورة، حد أقصى 5MB) ومراجعته وقبوله أو رفضه من لوحة المعلم.
- بناء امتحانات (أسئلة اختيارية) من لوحة المعلم، وتسليمها وتصحيحها تلقائياً للطالب.
- سجل نشاط لحظي (دخول/خروج/اشتراك/تسليم امتحان...) يظهر للمعلم.
- مساعد ذكاء اصطناعي (اختياري) لشرح مفاهيم برمجية بالعربي.

## 🔐 الصلاحيات
كل القواعد موجودة في `firestore.rules` و`storage.rules`، وملخصها:
- أي حد يقدر يقرأ الكورسات والامتحانات.
- الطالب يقدر يقرأ ويعدّل بياناته وإشعارات دفعه ونتايجه بس.
- المعلم بس اللي يقدر يضيف أو يمسح كورسات وامتحانات، ويراجع المدفوعات، ويشوف كل الطلاب والأنشطة.

## 📝 ملاحظات
- الموقع من غير أي build step — HTML/CSS/JS عادي، تقدر تفتحه مباشرة أو تستضيفه على أي استضافة استاتيك (مش لازم Firebase Hosting بالذات).
- لو الموقع منشور على دومين تاني غير اللي متسجل في `worker.js`، لازم تضيفه في `ALLOWED` عشان الـ CORS يشتغل.
