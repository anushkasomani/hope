"use client";
import React, { useEffect, useState } from 'react';
import StartDemoButton from '../components/StartDemoButton';
import ArtifactPanel from '../components/ArtifactPanel';
import LogViewer from '../components/LogViewer';
import ConnectionDiagram from '../components/ConnectionDiagram';
import Toast from '../components/Toast';

export default function Page() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState('(no logs)');
  const [status, setStatus] = useState('idle');
  const [agentCard, setAgentCard] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [lastStart, setLastStart] = useState<string>('');
  const [lastNetwork, setLastNetwork] = useState<string>('');
  const prevStep = React.useRef<string>('idle');

  useEffect(() => {
    let t = setInterval(async () => {
      try {
        const s = await fetch('/api/orchestrate/status').then((r) => r.json());
        const newStep = s.step || 'idle';
        setStatus(newStep);
        // When transitioning into these states, refresh artifacts — but do not overwrite
        // existing artifacts with negative results. Retry a few times to allow logs to flush.
        const shouldFetchArtifacts = ['payment_created', 'verified', 'settled', 'done'];
        if (prevStep.current !== newStep && shouldFetchArtifacts.includes(newStep)) {
          const fetchWithRetries = async (url: string, attempts = 3, delayMs = 700) => {
            for (let i = 0; i < attempts; i++) {
              try {
                const res = await fetch(url);
                if (!res.ok) { await new Promise((r) => setTimeout(r, delayMs)); continue; }
                const js = await res.json().catch(() => null);
                // If endpoint explicitly says not found, retry
                if (js && js.found === false) { await new Promise((r) => setTimeout(r, delayMs)); continue; }
                return js;
              } catch (e) {
                await new Promise((r) => setTimeout(r, delayMs));
              }
            }
            return null;
          };

          try {
            const pay = await fetchWithRetries('/api/artifacts/payment', 4, 600);
            if (pay) setPayment(pay);
          } catch (_) { }
          try {
            const resp = await fetchWithRetries('/api/artifacts/response', 4, 600);
            if (resp) setResponse(resp);
          } catch (_) { }
          // Notify user on completion states
          if (newStep === 'settled' || newStep === 'done') {
            setToast('Demo completed');
          }
        }
        prevStep.current = newStep;
        if (s.tx) setResponse((r) => r || { json: { transaction: s.tx } });

        const l = await fetch('/api/orchestrate/logs').then((r) => r.text());
        setLogs(l || '(no logs)');

        const acRes = await fetch('/api/artifacts/agent-card');
        const ac = acRes.ok ? await acRes.json().catch(() => null) : null;
        setAgentCard(ac || null);

      } catch (e) {
        // ignore
      }
    }, 1400);
    return () => clearInterval(t);
  }, []);

  async function startDemo() {
    setRunning(true);
    setToast('Starting demo...');
    try {
      const res = await fetch('/api/orchestrate/start', { method: 'POST' });
      let js: any = null;
      try {
        js = await res.json().catch(() => null);
      } catch (e) {
        js = null;
      }

      // expose network result to UI for debugging
      try {
        const text = JSON.stringify(js) || await res.text().catch(() => '');
        setLastNetwork(`status=${res.status} body=${text}`);
      } catch (_) {
        setLastNetwork(`status=${res.status}`);
      }

      if (res.ok) {
        setToast(js && js.pid ? `Started (pid: ${js.pid})` : 'Started');
        setStatus('starting');
        setLastStart(js && js.pid ? `Started pid=${js.pid}` : 'Started');
      } else {
        setToast('Failed to start demo');
        setLastStart(`failed: ${res.status}`);
      }
    } catch (e) {
      setToast('Failed to start demo');
      setLastStart(`error: ${String(e)}`);
    } finally {
      setRunning(false);
      setTimeout(() => setToast(''), 2200);
    }
  }

  async function hardRefresh() {
    // call API to remove logs/pids
    await fetch('/api/orchestrate/hard-refresh', { method: 'POST' }).then((r) => r.json()).then(() => {
      // reset UI state
      setLogs('(no logs)');
      setAgentCard(null);
      setPayment(null);
      setResponse(null);
      setStatus('idle');
      setToast('Cleared demo logs');
      setTimeout(() => setToast(''), 1800);
    }).catch(() => {
      // ignore
    });
  }

  return (
    <div className="min-h-screen p-8 bg-[var(--bg)] text-[var(--text)]">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">A2A x402 Demo Dashboard</h1>
        <div className="flex items-center gap-3">
          <StartDemoButton running={running} onStart={() => startDemo()} onHardRefresh={() => hardRefresh()} />
        </div>
      </header>

      {lastStart ? (
        <div className="mb-4 text-sm text-gray-700">Last start: {lastStart}</div>
      ) : null}
      {lastNetwork ? (
        <div className="mb-2 text-sm text-gray-600">Network: {lastNetwork}</div>
      ) : null}

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-3 space-y-4">
          <ConnectionDiagram />
          <ArtifactPanel agentCard={agentCard} payment={payment} response={response} />
        </aside>

        <main className="col-span-9">
          <h3 className="mb-2 text-lg font-medium">Logs</h3>
          <LogViewer logs={logs} />
        </main>
        <aside className="col-span-3">
          <div className="mt-6 p-4 bg-[var(--panel)] rounded-md shadow-sm">
            <h4 className="font-medium mb-2">Details</h4>
            <div className="text-sm text-gray-700">Network: polygon-amoy (80002)</div>
            <div className="text-sm text-gray-700">Payment: 0.01 USDC</div>
          </div>
        </aside>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
} 