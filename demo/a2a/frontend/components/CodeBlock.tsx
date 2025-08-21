"use client";
import React from 'react';

export default function CodeBlock({ content, language = 'json' }: { content: string | React.ReactNode; language?: string }) {
  return (
    <div className="relative">
      <pre className="bg-[var(--panel)] text-sm font-mono p-3 rounded-md overflow-auto whitespace-pre-wrap">
        {typeof content === 'string' ? content : content}
      </pre>
    </div>
  );
} 