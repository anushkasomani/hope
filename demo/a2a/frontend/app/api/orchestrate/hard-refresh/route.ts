import { NextResponse } from 'next/server';
import fs from 'fs';

export async function POST(req: Request) {
  const candidates = [
    '/tmp/fac.log',
    '/tmp/res.log',
    '/tmp/service.log',
    '/tmp/client_run.log',
    '/tmp/client_run3.log',
    '/tmp/client_run4.log',
    '/tmp/client.log',
    '/tmp/frontend.log',
  ];

  const pidFiles = ['/tmp/fac.pid', '/tmp/res.pid', '/tmp/service.pid', '/tmp/client.pid', '/tmp/frontend.pid'];

  const deleted: string[] = [];

  for (const f of candidates) {
    try {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        deleted.push(f);
      }
    } catch (e) {
      // ignore
    }
  }

  for (const p of pidFiles) {
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        deleted.push(p);
      }
    } catch (e) {
      // ignore
    }
  }

  return NextResponse.json({ ok: true, deleted });
} 