import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function findClientLog() {
  try {
    const files = fs.readdirSync('/tmp').filter((f) => /^client_run.*\.log$/.test(f));
    if (files.length > 0) {
      files.sort();
      return path.join('/tmp', files[files.length - 1]);
    }
  } catch (e) {
    // ignore
  }
  const candidates = ['/tmp/client_run.log', '/tmp/client_run_real.log', '/tmp/client_debug.log', '/tmp/client_run3.log', '/tmp/client_run4.log'];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

export async function GET() {
  try {
    const logPath = findClientLog();
    const log = logPath && fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : (fs.existsSync('/tmp/fac.log') ? fs.readFileSync('/tmp/fac.log', 'utf8') : '');

    if (!log) return NextResponse.json({ found: false });

    const m = log.match(/X-PAYMENT-RESPONSE['"]?:?\s*([A-Za-z0-9+/=]+)\b/);
    if (!m) return NextResponse.json({ found: false });

    const b64 = m[1];
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    let json = null;
    try { json = JSON.parse(raw); } catch (e) { json = raw; }

    // try to extract transaction if present
    const tx = (json && json.transaction) || (json && json.transactionHash) || null;
    const txLink = tx ? `https://mumbai.polygonscan.com/tx/${tx}` : null; // placeholder; user wants Amoy explorer — use Amoy when available

    return NextResponse.json({ raw, json, tx, txLink });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 