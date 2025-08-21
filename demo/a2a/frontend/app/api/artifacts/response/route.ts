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

    // First try to find an A2A response JSON block (the client logs 'A2A response: { ... }')
    const a2aRe = /A2A response:\s*({[\s\S]*?})/i;
    const a2aMatch = log.match(a2aRe);
    if (a2aMatch) {
      try {
        const parsedA2A = JSON.parse(a2aMatch[1]);
        // deep-search parsed A2A JSON for xPaymentResponse
        function deepFindObj(obj: any): any {
          if (!obj || typeof obj !== 'object') return null;
          for (const k of Object.keys(obj)) {
            if (/^xpaymentresponse$/i.test(k) || /^x-payment-response$/i.test(k) || /^xPaymentResponseBase64$/i.test(k)) return obj[k];
            const val = obj[k];
            if (typeof val === 'object') {
              const found = deepFindObj(val);
              if (found) return found;
            }
          }
          return null;
        }
        const foundInA2A = deepFindObj(parsedA2A);
        if (foundInA2A) {
          const rawB64 = String(foundInA2A).replace(/\s+/g, '');
          const raw = Buffer.from(rawB64, 'base64').toString('utf8');
          let json = null;
          try { json = JSON.parse(raw); } catch (e) { json = raw; }
          const tx = (json && json.transaction) || (json && json.transactionHash) || null;
          const txLink = tx ? `https://mumbai.polygonscan.com/tx/${tx}` : null;
          return NextResponse.json({ raw, json, tx, txLink });
        }
      } catch (e) {
        // ignore parse errors and fall back to other methods
      }
    }

    // Try header-style or inline key matches first (case-insensitive)
    const headerRe = /(?:X-PAYMENT-RESPONSE|xPaymentResponse)\s*[:=]?\s*["']?([A-Za-z0-9+\/=]{20,})["']?/i;
    let m = log.match(headerRe);

    // Fallback: scan JSON blocks for xPaymentResponse-like keys
    if (!m) {
      const jsonBlocks = log.match(/\{[\s\S]*?\}/g) || [];
      for (const block of jsonBlocks) {
        try {
          const parsed = JSON.parse(block);
          // deep-search for any key that matches xPaymentResponse (case-insensitive)
          function deepFind(obj: any): any {
            if (!obj || typeof obj !== 'object') return null;
            for (const k of Object.keys(obj)) {
              if (/^xpaymentresponse$/i.test(k) || /^x-payment-response$/i.test(k) || /^xPaymentResponseBase64$/i.test(k)) return obj[k];
              const val = obj[k];
              if (typeof val === 'object') {
                const found = deepFind(val);
                if (found) return found;
              }
            }
            return null;
          }
          const found = deepFind(parsed);
          if (found) { m = [null, String(found)]; break; }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    if (!m) return NextResponse.json({ found: false });

    const b64 = String(m[1] || '').replace(/\s+/g, '');
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