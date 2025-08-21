"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: React.ReactNode; content: React.ReactNode }[]; active?: string; onChange?: (id: string) => void }) {
  const [activeId, setActiveId] = useState(active ?? (tabs[0]?.id ?? ''));

  useEffect(() => {
    if (active !== undefined) setActiveId(active);
  }, [active]);

  function select(id: string) {
    if (onChange) onChange(id);
    if (active === undefined) setActiveId(id);
  }

  return (
    <div>
      <div role="tablist" className="flex gap-2 mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeId === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            className={`px-3 py-1 rounded ${activeId === t.id ? 'bg-accent text-white' : 'bg-panel text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <AnimatePresence mode="wait">
          {tabs.map((t) => (
            activeId === t.id ? (
              <motion.div key={t.id} id={`panel-${t.id}`} role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {t.content}
              </motion.div>
            ) : null
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
} 