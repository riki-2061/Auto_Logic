function parseResendError(status, errBody) {
  var msg = "";
  try {
    var parsed = JSON.parse(errBody);
    msg = parsed.message || parsed.error || "";
  } catch (e) {
    msg = errBody || "";
  }

  if (status === 401 || status === 403) {
    return "מפתח Resend לא תקין. הוסיפי RESEND_API_KEY ב-Vercel → Settings → Environment Variables.";
  }
  if (/only send testing emails to your own email/i.test(msg)) {
    return "ב-Resend (חינמי) אפשר לשלוח רק למייל שאיתו נרשמתם ל-Resend, או לאחר אימות דומיין.";
  }
  if (/invalid.*from/i.test(msg) || /from address/i.test(msg)) {
    return "כתובת השולח לא תקינה. ב-Vercel הגדירי RESEND_FROM=onboarding@resend.dev";
  }
  if (msg) {
    return "שליחה נכשלה: " + msg;
  }
  return "שליחה נכשלה. בדקי את הגדרות Resend ב-Vercel (RESEND_API_KEY, CONTACT_TO, RESEND_FROM).";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendContactEmail(body) {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error:
        "חסר RESEND_API_KEY. פתחי /api/env-check באתר — אם false: Vercel → Environment Variables (Production) → Redeploy.",
    };
  }

  const { name, email, phone, company, message } = body || {};
  if (!name || !email || !phone || !message) {
    return { ok: false, status: 400, error: "נא למלא את כל השדות הנדרשים." };
  }

  const toRaw = process.env.CONTACT_TO || "riki2061@gmail.com";
  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

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
      return {
        ok: false,
        status: 502,
        error: parseResendError(r.status, errBody),
      };
    }

    return { ok: true, status: 200 };
  } catch (e) {
    console.error(e);
    return { ok: false, status: 502, error: "שגיאת רשת. נסו שוב מאוחר יותר." };
  }
}

module.exports = { sendContactEmail };
