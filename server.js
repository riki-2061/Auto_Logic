/**
 * שרת סטטי + API לשליחת טופס צור קשר דרך Resend.
 * המפתח נקרא מ-.env בלבד — לא שמים אותו ב-HTML/JS בדפדפן.
 */
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(express.json({ limit: "48kb" }));

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

app.post("/api/contact", async (req, res) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Missing RESEND_API_KEY in .env");
    return res.status(500).json({ ok: false, error: "השרת לא הוגדר (חסר מפתח)." });
  }

  const { name, email, phone, company, message } = req.body || {};
  if (!name || !email || !phone || !message) {
    return res.status(400).json({ ok: false, error: "נא למלא את כל השדות הנדרשים." });
  }

  const toRaw = process.env.CONTACT_TO || "rl.autologic@gmail.com";
  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.RESEND_FROM || "Auto Logic <onboarding@resend.dev>";

  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(company || "—");
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  const html = `
    <div dir="rtl" style="font-family: system-ui, sans-serif;">
      <h2 style="color:#004d5a;">פנייה חדשה מאתר Auto Logic</h2>
      <p><strong>שם:</strong> ${safeName}</p>
      <p><strong>עסק:</strong> ${safeCompany}</p>
      <p><strong>אימייל:</strong> ${safeEmail}</p>
      <p><strong>טלפון:</strong> ${safePhone}</p>
      <p><strong>הודעה:</strong></p>
      <p>${safeMessage}</p>
    </div>
  `;

  const text = [
    "פנייה מאתר Auto Logic",
    `שם: ${name}`,
    `עסק: ${company || "—"}`,
    `אימייל: ${email}`,
    `טלפון: ${phone}`,
    "",
    message,
  ].join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: "פנייה מאתר Auto Logic — " + String(name).slice(0, 80),
        html,
        text,
      }),
    });

    if (!r.ok) {
      const errBody = await r.text();
      console.error("Resend HTTP", r.status, errBody);
      return res.status(502).json({ ok: false, error: "שליחה נכשלה. נסו שוב או צרו קשר בטלפון." });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false, error: "שגיאת רשת. נסו שוב מאוחר יותר." });
  }
});

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log("Auto Logic — http://localhost:" + PORT);
  console.log("טופס צור קשר → Resend (בדקו ש-.env מוגדר)");
});
