"use client";
import React, { useState } from 'react';
import Toast from './Toast';
import CodeBlock from './CodeBlock';
import Tabs from './Tabs';
import { CopyIcon, ExternalIcon } from './Icons';

export default function ArtifactPanel({ agentCard, payment, response }: any) {
  const [copied, setCopied] = useState<{ [k: string]: boolean }>({});
  const [toast, setToast] = useState('');

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied((s) => ({ ...s, [key]: true }));
      setToast('Copied to clipboard');
      setTimeout(() => setCopied((s) => ({ ...s, [key]: false })), 1500);
    } catch (e) {
      console.error('copy failed', e);
      setToast('Copy failed');
    }
  }

  const explorerBase = 'https://amoy.polygonscan.com/tx';

  const tabs = [
    {
      id: 'agent',
      label: 'AgentCard',
      content: (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => copy('agent', agentCard ? JSON.stringify(agentCard, null, 2) : '')} className="px-2 py-1 rounded-md bg-purple-600 text-white flex items-center gap-2">
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
          <CodeBlock content={agentCard ? JSON.stringify(agentCard, null, 2) : '(not available)'} />
        </div>
      )
    },

    {
      id: 'payment',
      label: 'X-PAYMENT',
      content: (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => copy('payment', payment ? (payment.raw || JSON.stringify(payment, null, 2)) : '')} className="px-2 py-1 rounded-md bg-purple-600 text-white flex items-center gap-2">
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
          <CodeBlock content={payment ? (payment.raw || JSON.stringify(payment, null, 2)) : '(not available)'} />
        </div>
      )
    },

    {
      id: 'response',
      label: 'X-PAYMENT-RESPONSE',
      content: (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => copy('response', response ? (response.raw || JSON.stringify(response.json || response, null, 2)) : '')} className="px-2 py-1 rounded-md bg-purple-600 text-white flex items-center gap-2">
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
          <CodeBlock content={response ? (response.raw || JSON.stringify(response.json || response, null, 2)) : '(not available)'} />
          {response && response.json && response.json.transaction ? (
            <div className="mt-2 flex items-center gap-2">
              <a href={`${explorerBase}/${response.json.transaction}`} target="_blank" rel="noreferrer" className="text-purple-600 underline flex items-center gap-1">
                View on Amoy Explorer <ExternalIcon className="w-4 h-4" />
              </a>
            </div>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div>
      <h3>Artifacts</h3>
      <Tabs tabs={tabs} />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
} 