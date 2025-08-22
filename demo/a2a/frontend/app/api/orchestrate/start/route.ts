import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function findDemoRoot(): string {
  let dir = process.cwd();
  while (dir && dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, 'demo', 'a2a'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export async function POST(req: Request) {
  // If running on Vercel or in remote orchestrator mode, do NOT shell out.
  const isVercel = !!process.env.VERCEL;
  const orchestratorMode = process.env.ORCHESTRATOR_MODE || '';
  const orchestratorBase = process.env.ORCHESTRATOR_BASE_URL || process.env.ORCHESTRATOR_BASE || '';

  if (isVercel || orchestratorMode === 'remote') {
    if (!orchestratorBase) {
      return NextResponse.json({ error: 'shell_out_disabled', reason: 'ORCHESTRATOR_BASE_URL not configured' }, { status: 403 });
    }

    try {
      const target = orchestratorBase.replace(/\/$/, '') + '/start';
      const proxyRes = await fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: await req.text() });
      const js = await proxyRes.json().catch(() => null);
      return NextResponse.json(js || { proxied: true }, { status: proxyRes.status });
    } catch (e) {
      return NextResponse.json({ error: 'orchestrator_proxy_failed', details: String(e) }, { status: 500 });
    }
  }

  const repo = findDemoRoot();
  const script = path.join(repo, 'demo', 'scripts', 'start-all.sh');
  if (!fs.existsSync(script)) {
    return NextResponse.json({ error: 'script_not_found', path: script }, { status: 500 });
  }

  // Spawn the orchestrator and capture stderr/stdout briefly to detect fast failures
  // Clone the current env but remove PORT to avoid inheriting the frontend's dev port (commonly 3000)
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  if (childEnv.PORT) delete childEnv.PORT;
  const child = spawn('bash', [script], { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: childEnv });

  let stderr = '';
  let stdout = '';
  if (child.stderr) child.stderr.on('data', (d) => { stderr += d.toString(); });
  if (child.stdout) child.stdout.on('data', (d) => { stdout += d.toString(); });

  // Wait a short period to detect immediate failures (compilation errors, missing env, etc.)
  const result = await new Promise<{ ok: boolean; code?: number; out?: string; err?: string }>((resolve) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) { finished = true; resolve({ ok: true }); }
    }, 4000);
    child.on('error', (err) => {
      if (!finished) { finished = true; clearTimeout(timer); resolve({ ok: false, err: String(err), out: stdout }); }
    });
    child.on('exit', (code) => {
      if (!finished) { finished = true; clearTimeout(timer); if (code === 0) resolve({ ok: true }); else resolve({ ok: false, code, err: stderr, out: stdout }); }
    });
  });

  if (!result.ok) {
    const combined = `${result.out || ''}\n${result.err || ''}`.trim();
    return NextResponse.json({ error: 'start_failed', details: { code: result.code, output: combined } }, { status: 500 });
  }

  try { child.unref(); } catch (e) { /* ignore */ }
  return NextResponse.json({ started: true, pid: child.pid });
} 