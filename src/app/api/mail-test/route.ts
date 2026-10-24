import nodemailer from 'nodemailer';

// Checks the Gmail login and sends one test email to the store's own Gmail. Only works while MAIL_TEST_KEY is set.
export async function GET(req: Request) {
  const key = process.env.MAIL_TEST_KEY;
  if (!key || new URL(req.url).searchParams.get('k') !== key) return new Response('Not found', { status: 404 });
  const user = process.env.GMAIL_USER || '', pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  try {
    const smtp = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    await smtp.sendMail({ from: `${process.env.MAIL_NAME || 'Store'} <${user}>`, to: user, subject: 'Store mail test', text: 'If you can read this, login codes will arrive too.' });
    return Response.json({ ok: true, passLength: pass.length });
  } catch (e) {
    return Response.json({ ok: false, passLength: pass.length, error: String(e) }, { status: 500 });
  }
}
