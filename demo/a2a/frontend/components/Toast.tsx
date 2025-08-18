"use client";
import React, { useEffect } from 'react';
import { CheckIcon } from './Icons';

export default function Toast({ message, onClose }: { message: string; onClose?: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), 1800);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  const success = message.toLowerCase().includes('copied');

  return (
    <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-2 animate-fade-in">
      {success ? <CheckIcon className="w-4 h-4 text-green-400" /> : null}
      <div>{message}</div>
    </div>
  );
} 