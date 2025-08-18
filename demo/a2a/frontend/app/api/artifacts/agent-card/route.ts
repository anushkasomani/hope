import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const repo = findDemoRoot();
    const p = path.join(repo, 'demo', 'a2a', 'service-agent', 'agent-card.json');
    if (!fs.existsSync(p)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
} 