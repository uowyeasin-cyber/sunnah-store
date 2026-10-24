import 'server-only';

// Sends through Resend when RESEND_API_KEY is set; otherwise prints to the server log (local dev).
export async function sendMail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[mail] to ${to}: ${subject}\n${text}`); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Store <orders@example.com>', to, subject, text }),
  });
  if (!res.ok) throw new Error(`Mail failed: ${res.status}`);
}
