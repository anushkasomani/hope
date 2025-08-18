import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function findClientLog() {
  // prefer most recent client_run* file in /tmp
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

function readTail(file: string, lines = 200) {
  try {
    const data = fs.readFileSync(file, 'utf8');
    const arr = data.split('\n');
    return arr.slice(-lines).join('\n');
  } catch (e) {
    return '';
  }
}

export async function GET() {
  try {
    let logPath = findClientLog();
    let log = '';
    if (logPath) {
      log = readTail(logPath);
    } else if (fs.existsSync('/tmp/fac.log')) {
      // fallback to facilitator log if client log absent
      log = readTail('/tmp/fac.log');
    }

    if (!log) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const domainMatch = log.match(/CLIENT: typed-data domain=\s*(\{[\s\S]*?\})/) || log.match(/FACILITATOR: typed-data domain=\s*(\{[\s\S]*?\})/);
    const typesMatch = log.match(/CLIENT: types=\s*(\{[\s\S]*?\})/) || log.match(/FACILITATOR: types=\s*(\{[\s\S]*?\})/);
    const messageMatch = log.match(/CLIENT: message=\s*(\{[\s\S]*?\})/) || log.match(/FACILITATOR: message=\s*(\{[\s\S]*?\})/);
    const sigMatch = log.match(/CLIENT: signature=\s*([0-9a-fx]+)/i) || log.match(/FACILITATOR: signature=\s*([0-9a-fx]+)/i);

    if (!messageMatch) return NextResponse.json({ found: false });

    const domainRaw = domainMatch ? domainMatch[1] : null;
    const typesRaw = typesMatch ? typesMatch[1] : null;
    const messageRaw = messageMatch ? messageMatch[1] : null;
    const signature = sigMatch ? sigMatch[1] : null;

    // Try to parse but fall back to raw strings if parsing fails
    let domain = null;
    let types = null;
    let message = null;
    try { if (domainRaw) domain = JSON.parse(domainRaw); } catch (e) { domain = domainRaw; }
    try { if (typesRaw) types = JSON.parse(typesRaw); } catch (e) { types = typesRaw; }
    try { if (messageRaw) message = JSON.parse(messageRaw); } catch (e) { message = messageRaw; }

    return NextResponse.json({ domain, types, message, signature });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 