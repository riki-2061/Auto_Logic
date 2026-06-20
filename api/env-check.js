function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  const key = (process.env.RESEND_API_KEY || "").trim();

  return res.status(200).json({
    ok: Boolean(key),
    env: {
      RESEND_API_KEY: Boolean(key),
      CONTACT_TO: Boolean((process.env.CONTACT_TO || "").trim()),
      RESEND_FROM: Boolean((process.env.RESEND_FROM || "").trim()),
    },
    hint: key
      ? "המפתח קיים — אם הטופס עדיין נכשל, הבעיה ב-Resend (מייל/דומיין)."
      : "חסר RESEND_API_KEY. הוסיפי ב-Vercel → Settings → Environment Variables → Production → Redeploy.",
  });
}

handler.config = { runtime: "nodejs18.x" };
module.exports = handler;
