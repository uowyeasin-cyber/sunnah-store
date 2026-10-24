import type { NextRequest } from 'next/server';
// Callback base URL: SITE_URL in production, else whatever host the customer used.
export const siteOf = (req: NextRequest) => process.env.SITE_URL || req.nextUrl.origin;
