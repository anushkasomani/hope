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

function pidExists(file: string) {
  try {
    if (!fs.existsSync(file)) return false;
    const pid = fs.readFileSync(file, 'utf8').trim();
    if (!pid) return false;
    return fs.existsSync(`/proc/${pid}`) || process.kill(Number(pid), 0) === true;
  } catch (e) {
    return false;
  }
}

export async function GET() {
  const facLog = '/tmp/fac.log';
  const svcLog = '/tmp/service.log';
  const resLog = '/tmp/res.log';
  const clientLog = findClientLog();

  const fac = readTail(facLog);
  const svc = readTail(svcLog);
  const res = readTail(resLog);
  const client = clientLog ? readTail(clientLog) : '';

  let step = 'idle';
  if (fac.includes('settlement tx submitted') || fac.includes('FACILITATOR: settlement tx submitted')) {
    step = 'settled';
  } else if (fac.includes('FACILITATOR: signature') || client.includes('CLIENT: signature')) {
    step = 'verified';
  } else if (svc.includes('Service Agent listening') && res.includes('Resource server listening')) {
    step = 'services_started';
  } else if (client.includes('CLIENT: typed-data')) {
    step = 'payment_created';
  } else if (fs.existsSync('/tmp/fac.pid') || fs.existsSync('/tmp/service.pid') || fs.existsSync('/tmp/res.pid')) {
    // services started but health not yet seen
    step = 'starting';
  }

  const txMatch = (fac.match(/settlement tx submitted\s+(0x[0-9a-fA-F]+)/) || [])[1] || null;

  // persist last seen step to avoid bouncing
  try {
    const lastPath = '/tmp/a2a_last_step';
    let last = '';
    if (fs.existsSync(lastPath)) last = fs.readFileSync(lastPath, 'utf8').trim();
    if ((last === 'starting' || last === 'payment_created') && step === 'idle') {
      // keep previous transient state
      step = last;
    }
    fs.writeFileSync(lastPath, step);
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ step, tx: txMatch });
} 