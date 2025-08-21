"use client";
import React, { useEffect } from 'react';
import { CheckIcon } from './Icons';
import { motion } from 'framer-motion';

export default function Toast({ message, onClose, action }: { message: string; onClose?: () => void; action?: { label: string; onClick: () => void } }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), 2200);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  const success = message.toLowerCase().includes('copied') || message.toLowerCase().includes('completed');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed bottom-6 right-6 bg-panel text-white px-4 py-3 rounded-md shadow-lg z-50 flex items-center gap-3">
      {success ? <CheckIcon className="w-5 h-5 text-green-400" /> : null}
      <div className="text-sm">{message}</div>
      {action ? (
        <button onClick={() => { action.onClick(); onClose && onClose(); }} className="ml-2 px-3 py-1 bg-accent rounded text-xs text-white">
          {action.label}
        </button>
      ) : null}
    </motion.div>
  );
} 