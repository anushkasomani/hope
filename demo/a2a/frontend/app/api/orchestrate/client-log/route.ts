import { NextResponse } from 'next/server';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const entry = { ts: new Date().toISOString(), body };
    const path = '/tmp/frontend_client.log';
    fs.appendFileSync(path, JSON.stringify(entry) + '\n');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const path = '/tmp/frontend_client.log';
    if (!fs.existsSync(path)) return NextResponse.json({ ok: true, entries: [] });
    const data = fs.readFileSync(path, 'utf8').trim();
    const lines = data ? data.split('\n').map((l) => JSON.parse(l)) : [];
    return NextResponse.json({ ok: true, entries: lines.slice(-200) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
} 