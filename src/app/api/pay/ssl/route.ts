import { NextRequest, NextResponse } from 'next/server';
import { markFailed, verifySsl } from '@/lib/pay';
import { siteOf } from '../site';

// SSLCommerz posts success, fail, cancel and IPN here.
export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const valId = String(fd.get('val_id') || '');
  let id = String(fd.get('value_a') || '');
  if (valId) id = (await verifySsl(valId).catch(e => { console.error(e); return undefined; })) || id;
  else if (id && /FAILED|CANCELLED/i.test(String(fd.get('status')))) await markFailed(id);
  return NextResponse.redirect(`${siteOf(req)}/order/${id}`, 303);
}
