import 'server-only';
import nodemailer from 'nodemailer';

// Sends through Gmail when GMAIL_USER + GMAIL_APP_PASSWORD are set, else Resend when
// RESEND_API_KEY is set; otherwise prints to the server log (local dev).
export async function sendMail(to: string, subject: string, text: string) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (user && pass) {
    const smtp = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass: pass.replace(/\s/g, '') } });
    try {
      await smtp.sendMail({ from: `${process.env.MAIL_NAME || 'Store'} <${user}>`, to, subject, text });
      return;
    } catch (e) {
      // Bad Gmail settings shouldn't lock everyone out; try Resend below.
      if (!process.env.RESEND_API_KEY) throw e;
      console.error('[mail] Gmail failed, using Resend', e);
    }
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[mail] to ${to}: ${subject}\n${text}`); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Store <orders@example.com>', to, subject, text }),
  });
  if (!res.ok) throw new Error(`Mail failed: ${res.status}`);
}
