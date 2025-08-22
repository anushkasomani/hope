const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

let lastPid = null;
let lastStatus = 'idle';
let lastLogs = '';
let lastArtifacts = {};

function findDemoRoot() {
  // assume repository root is parent of demo/
  let dir = __dirname;
  while (dir && dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, 'demo', 'scripts', 'start-all.sh'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

app.post('/start', (req, res) => {
  const root = findDemoRoot();
  if (!root) {
    lastStatus = 'error';
    return res.status(500).json({ error: 'demo_root_not_found' });
  }
  const script = path.join(root, 'demo', 'scripts', 'start-all.sh');
  if (!fs.existsSync(script)) return res.status(500).json({ error: 'script_not_found', path: script });

  // spawn the script in background and capture logs to /tmp (same as demo expects)
  try {
    const child = spawn('bash', [script], { detached: true, stdio: 'ignore', env: process.env });
    lastPid = child.pid;
    lastStatus = 'starting';
    child.unref();
    return res.json({ started: true, pid: lastPid });
  } catch (e) {
    lastStatus = 'error';
    return res.status(500).json({ error: String(e) });
  }
});

app.get('/status', (req, res) => {
  // read last step file if exists
  const lastPath = '/tmp/a2a_last_step';
  if (fs.existsSync(lastPath)) {
    const step = fs.readFileSync(lastPath, 'utf8').trim();
    lastStatus = step;
  }
  res.json({ step: lastStatus, pid: lastPid });
});

app.get('/logs', (req, res) => {
  // tail the same files the dashboard reads
  const fac = fs.existsSync('/tmp/fac.log') ? fs.readFileSync('/tmp/fac.log', 'utf8') : '';
  const svc = fs.existsSync('/tmp/service.log') ? fs.readFileSync('/tmp/service.log', 'utf8') : '';
  const reslog = fs.existsSync('/tmp/res.log') ? fs.readFileSync('/tmp/res.log', 'utf8') : '';
  const client = fs.existsSync('/tmp/client_run.log') ? fs.readFileSync('/tmp/client_run.log', 'utf8') : '';
  const combined = `--- FACILITATOR (/tmp/fac.log) ---\n${fac}\n\n--- SERVICE (/tmp/service.log) ---\n${svc}\n\n--- RESOURCE (/tmp/res.log) ---\n${reslog}\n\n--- CLIENT (/tmp/client_run.log) ---\n${client}`;
  res.type('text/plain').send(combined);
});

app.get('/artifacts/agent-card', (req, res) => {
  // return static service agent agent-card file if exists
  const svcCard = path.join(process.cwd(), 'demo', 'a2a', 'service-agent', 'agent-card.json');
  if (fs.existsSync(svcCard)) {
    try { const js = JSON.parse(fs.readFileSync(svcCard, 'utf8')); return res.json(js); } catch (e) { }
  }
  res.status(404).json({ found: false });
});

app.get('/artifacts/payment', (req, res) => {
  const clientLog = fs.existsSync('/tmp/client_run.log') ? fs.readFileSync('/tmp/client_run.log', 'utf8') : '';
  // same parsing logic as dashboard - but simpler: return not found if not present
  if (!clientLog.includes('CLIENT: typed-data')) return res.status(404).json({ found: false });
  // naive return
  return res.json({ found: true, raw: 'client-typed-data' });
});

app.get('/artifacts/response', (req, res) => {
  const clientLog = fs.existsSync('/tmp/client_run.log') ? fs.readFileSync('/tmp/client_run.log', 'utf8') : (fs.existsSync('/tmp/fac.log') ? fs.readFileSync('/tmp/fac.log', 'utf8') : '');
  const m = clientLog.match(/xPaymentResponse\":\s*\"([A-Za-z0-9+/=]+)\"/i) || clientLog.match(/X-PAYMENT-RESPONSE\s*[:=]?\s*([A-Za-z0-9+/=]+)/i);
  if (!m) return res.status(404).json({ found: false });
  const b64 = m[1];
  try {
    const raw = Buffer.from(b64, 'base64').toString('utf8');
    return res.json({ found: true, raw, json: JSON.parse(raw) });
  } catch (e) {
    return res.json({ found: true, raw: Buffer.from(b64, 'base64').toString('utf8') });
  }
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Orchestrator stub listening on ${PORT}`)); 