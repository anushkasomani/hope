import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function readTail(file: string, lines = 200) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    const arr = data.split('\n');
    return arr.slice(-lines).join('\n');
  } catch (e) {
    return '';
  }
}

function findClientLog(): string | null {
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
  const fac = readTail('/tmp/fac.log');
  const svc = readTail('/tmp/service.log');
  const res = readTail('/tmp/res.log');
  const clientPath = findClientLog();
  const client = clientPath ? readTail(clientPath) : '';

  const combined = `--- FACILITATOR (${fs.existsSync('/tmp/fac.log') ? '/tmp/fac.log' : 'missing'}) ---\n${fac}\n\n--- SERVICE (/tmp/service.log) ---\n${svc}\n\n--- RESOURCE (/tmp/res.log) ---\n${res}\n\n--- CLIENT (${clientPath || 'none'}) ---\n${client}`;

  return new NextResponse(combined, { status: 200, headers: { 'Content-Type': 'text/plain' } });
} 