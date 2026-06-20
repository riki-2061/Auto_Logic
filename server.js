/**
 * שרת מקומי לפיתוח — npm start → http://localhost:3000
 * ב-Vercel האתר הסטטי + api/contact.js רצים ישירות (ראו vercel.json).
 */
require("dotenv").config();
const express = require("express");
const path = require("path");
const { sendContactEmail } = require("./lib/contact");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(express.json({ limit: "48kb" }));

app.post("/api/contact", async (req, res) => {
  const result = await sendContactEmail(req.body);
  return res.status(result.status).json({ ok: result.ok, error: result.error });
});

app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log("Auto Logic — http://localhost:" + PORT);
  console.log("טופס צור קשר → Resend (בדקו ש-.env מוגדר)");
});
