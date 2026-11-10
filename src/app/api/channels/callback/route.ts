import { NextRequest } from 'next/server';
import { finish } from '@/lib/channelCallback';

export const GET = (req: NextRequest) => finish(req, '');
