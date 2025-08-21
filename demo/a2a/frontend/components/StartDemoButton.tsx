"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function StartDemoButton({ running, onStart, onHardRefresh }: { running: boolean; onStart: () => void; onHardRefresh?: () => void }) {
  async function startAndLog() {
    try {
      fetch('/api/orchestrate/client-log', { method: 'POST', body: JSON.stringify({ event: 'start_clicked' }), headers: { 'content-type': 'application/json' } }).catch(() => { });
    } catch (e) {
      // ignore
    }
    onStart();
  }

  return (
    <div className="flex items-center gap-3">
      <motion.button
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        onClick={() => !running && startAndLog()}
        disabled={running}
        aria-pressed={running}
        aria-label={running ? 'Demo is running' : 'Start demo'}
        className={`px-5 py-2 rounded-lg font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-600 flex items-center gap-3 ${running ? 'bg-gray-700 text-gray-300 cursor-not-allowed' : 'bg-gradient-to-br from-accent to-accent-600 text-white shadow-soft'}`}
      >
        <span className="text-sm">{running ? 'Running...' : 'Start Demo'}</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onHardRefresh && onHardRefresh()}
        title="Hard Refresh: clears demo logs and temporary state"
        className="px-3 py-2 rounded-lg bg-panel text-muted hover:brightness-105"
      >
        <span className="text-sm">Hard Refresh</span>
      </motion.button>
    </div>
  );
} 