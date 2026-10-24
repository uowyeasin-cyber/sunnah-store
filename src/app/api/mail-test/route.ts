import { sendMail } from '@/lib/mail';

// Sends one test email to the store's own Gmail. Only works while MAIL_TEST_KEY is set.
export async function GET(req: Request) {
  const key = process.env.MAIL_TEST_KEY;
  if (!key || new URL(req.url).searchParams.get('k') !== key) return new Response('Not found', { status: 404 });
  const to = process.env.GMAIL_USER || '';
  try {
    await sendMail(to, 'Store mail test', 'If you can read this, login codes will arrive too.');
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
