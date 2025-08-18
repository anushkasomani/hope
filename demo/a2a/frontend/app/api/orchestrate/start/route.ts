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
  const repo = findDemoRoot();
  const script = path.join(repo, 'demo', 'scripts', 'start-all.sh');
  if (!fs.existsSync(script)) {
    return NextResponse.json({ error: 'script_not_found', path: script }, { status: 500 });
  }
  const child = spawn('bash', [script], { detached: true, stdio: 'ignore', env: process.env });
  child.unref();
  return NextResponse.json({ started: true, pid: child.pid });
} 