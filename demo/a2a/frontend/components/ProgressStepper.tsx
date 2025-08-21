"use client";
import React from 'react';

export default function ProgressStepper({ step }: { step: string }) {
  const steps = ['idle', 'starting', 'services_started', 'payment_created', 'verified', 'settled', 'done'];
  return (
    <div>
      {steps.map((s) => (
        <div key={s} className="flex items-center gap-3 mb-2">
          <div className={`h-4 w-4 rounded-full ${s === step ? 'bg-purple-600 animate-pulse' : 'bg-gray-300'}`} />
          <div className="font-medium">{s}</div>
        </div>
      ))}
    </div>
  );
} 