"use client";
import React, { useEffect, useRef, useState } from 'react';
import CodeBlock from './CodeBlock';

function tryParseJSON(line: string) {
  try {
    return JSON.parse(line);
  } catch (_e) {
    return null;
  }
}

export default function LogViewer({ logs }: { logs: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Default: do NOT auto-follow new logs. User can enable Follow.
  const [follow, setFollow] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (!follow) return; // only scroll when Follow is enabled
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs, follow]);

  const renderLines = () => {
    const raw = (logs || '(no logs)').split('\n');
    // Filter out CLIENT sections and individual CLIENT: lines
    const filtered: string[] = [];
    for (let i = 0; i < raw.length; i++) {
      const line = raw[i];
      // If a CLIENT section header is found, skip until next header or end
      if (/^---\s*CLIENT\b/.test(line)) {
        i++;
        while (i < raw.length && !/^---\s/.test(raw[i])) i++;
        i--; // outer loop will increment
        continue;
      }
      // Skip individual lines that start with CLIENT:
      if (/^\s*CLIENT:\s*/i.test(line)) continue;
      filtered.push(line);
    }

    return filtered.map((l, i) => {
      const trimmed = l.replace(/\r$/, '');
      if (trimmed === '') return <div key={i} className="text-gray-500">&nbsp;</div>;
      // Section headers used by the orchestrator
      if (/^---\s/.test(trimmed)) return <div key={i} className="font-semibold text-sm py-1">{trimmed}</div>;
      // Try to detect JSON payloads and pretty-print them
      const json = tryParseJSON(trimmed);
      if (json) return (
        <pre key={i} className="bg-gray-50 text-xs font-mono p-2 rounded mb-1 overflow-auto">{JSON.stringify(json, null, 2)}</pre>
      );
      // Highlight errors
      if (/error|failed|exception|EADDRINUSE/i.test(trimmed)) return <div key={i} className="text-red-600 font-medium">{trimmed}</div>;
      // Timestamps or regular log lines
      return <div key={i} className="text-sm font-mono leading-tight">{trimmed}</div>;
    });
  };

  return (
    <div className="relative">
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setFollow((f) => !f)}
          className={`px-3 py-1 rounded ${follow ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          {follow ? 'Following' : 'Follow'}
        </button>
      </div>

      <div ref={ref} role="log" aria-live="polite" className="h-[60vh] overflow-auto p-2 bg-[var(--panel)] rounded-md">
        <div>{renderLines()}</div>
      </div>
    </div>
  );
} 