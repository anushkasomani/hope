"use client";
import React, { useEffect, useRef } from 'react';
import CodeBlock from './CodeBlock';

export default function LogViewer({ logs }: { logs: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div ref={ref} role="log" aria-live="polite" className="h-[60vh] overflow-auto p-2 bg-[var(--panel)] rounded-md">
      <CodeBlock content={logs || '(no logs)'} />
    </div>
  );
} 