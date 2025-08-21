"use client";
import React from 'react';

export default function ConnectionDiagram() {
  return (
    <div aria-hidden className="w-full p-4 bg-[var(--panel)] rounded-md shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">C</div>
          <div className="text-sm">Client Agent</div>
        </div>

        <svg width="240" height="60" viewBox="0 0 240 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-4">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L10 5 L0 10 z" fill="#7c3aed" />
            </marker>
          </defs>
          <line x1="20" y1="30" x2="220" y2="30" stroke="#E6E7EB" strokeWidth="3" markerEnd="url(#arrow)" />
        </svg>

        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">S</div>
          <div className="text-sm">Service Agent</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-medium">R</div>
          <div className="text-sm">Resource Server</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-medium">F</div>
          <div className="text-sm">Facilitator</div>
        </div>
      </div>
    </div>
  );
} 