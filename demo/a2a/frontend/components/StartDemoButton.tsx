"use client";
import React from 'react';

export default function StartDemoButton({ running, onStart, onHardRefresh }: { running: boolean; onStart: () => void; onHardRefresh?: () => void }) {
  async function startAndLog() {
    try {
      // fire-and-forget logging so we don't block the UI action
      fetch('/api/orchestrate/client-log', { method: 'POST', body: JSON.stringify({ event: 'start_clicked' }), headers: { 'content-type': 'application/json' } }).catch(() => { });
    } catch (e) {
      // ignore
    }
    onStart();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => !running && startAndLog()}
        disabled={running}
        aria-pressed={running}
        aria-label={running ? 'Demo is running' : 'Start demo'}
        className={`px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 ${running ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
      >
        {running ? 'Running...' : 'Start Demo'}
      </button>

      <button
        onClick={() => onHardRefresh && onHardRefresh()}
        title="Hard Refresh: clears demo logs and temporary state"
        className="px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        Hard Refresh
      </button>
    </div>
  );
} 