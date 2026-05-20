# Auto Logic — אתר תדמית

אתר (HTML + CSS + JS) לעסק **Auto Logic** — לאה לוי וריקי גרובייס.

## הרצה עם טופס צור קשר (Resend)

**חשוב:** מפתח ה-API של Resend **לא** נכנס ל־`index.html` או ל־`js/main.js` — כל מי שגולש באתר יוכל לראות אותו ולנצל אותו.  
המפתח נשמר רק בקובץ **`.env`** בצד השרת (`server.js`).

### שלבים

1. בתיקיית הפרויקט, צרו קובץ בשם **`.env`** (ליד `server.js`).
2. העתיקו את התוכן מ־**`.env.example`** והדביקו ב־`.env`.
3. הדביקו את המפתח שקיבלתם מ־Resend בשורה `RESEND_API_KEY=...` (מתחיל ב־`re_`).
4. ב־`CONTACT_TO=` כתבו את המייל שאליו תרצו לקבל את הפניות.
5. ב־`RESEND_FROM=` — בחשבון בלי דומיין מאומת משתמשים ב־`Auto Logic <onboarding@resend.dev>`. אחרי שמאמתים דומיין ב־Resend, מחליפים לכתובת מהדומיין שלכם.

```bash
cd c:\Users\User\Documents\Auto_Logic
npm install
npm start
```

גלשו ל־**http://localhost:3000** (לא לפתוח את `index.html` כקובץ ישירות — אחרת הטופס לא יגיע לשרת).

### אם פרסמתם מפתח בטעות (למשל ב־README או בצ'אט)

כדאי **לבטל וליצור מפתח חדש** בלוח Resend — המפתח הישן נחשב חשוף.

## הרצה בלי Node (בלי שליחת מייל)

אפשר עדיין לפתוח את האתר כסטטי:

```bash
python -m http.server 8080
```

במצב כזה **טופס צור קשר לא ישלח** ל־Resend (אין שרת). לפרודקשן צריך אחסון שמריץ את `server.js` או **Serverless** (Vercel / Netlify Function) עם אותו לוגיקה — המפתח רק ב־Environment Variables של האחסון.

## עדכון פרטי קשר באתר

ב־`index.html` עדכנו קישורי `mailto:`, `tel:`, WhatsApp (`wa.me`) ובלוק "דרכי התקשרות".

## קבצים

| קובץ | תיאור |
|------|--------|
| `index.html` | מבנה ותוכן |
| `css/styles.css` | עיצוב, RTL |
| `js/main.js` | תפריט, טופס → `POST /api/contact` |
| `server.js` | שרת סטטי + שליחה ל־Resend |
| `.env` | מפתח וכתובות (לא לשתף / לא לעלות לגיט) |
| `.env.example` | דוגמה לשדות ב־`.env` |
| `assets/logo.png` | לוגו |
