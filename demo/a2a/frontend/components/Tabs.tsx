"use client";
import React, { useState } from 'react';

export default function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');

  return (
    <div>
      <div role="tablist" className="flex gap-2 mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`px-3 py-1 rounded ${active === t.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tabs.map((t) => (
          <div key={t.id} id={`panel-${t.id}`} role="tabpanel" hidden={active !== t.id}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
} 