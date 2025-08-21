"use client";
import React, { useEffect, useState } from 'react';
import Toast from './Toast';
import CodeBlock from './CodeBlock';
import Tabs from './Tabs';
import { CopyIcon, ExternalIcon, CardIcon, PaymentIcon, ResponseIcon } from './Icons';

export default function ArtifactPanel({ agentCard, payment, response, active, onActiveChange }: any) {
  const [copied, setCopied] = useState<{ [k: string]: boolean }>({});
  const [toast, setToast] = useState('');
  const [internalActive, setInternalActive] = useState('agent');

  // If parent supplies `active`, prefer it; otherwise use internalActive
  const activeTab = active !== undefined ? active : internalActive;
  const setActiveTab = (id: string) => {
    if (onActiveChange) onActiveChange(id);
    if (active === undefined) setInternalActive(id);
  };

  useEffect(() => {
    // If a response becomes available and parent hasn't forced active, switch to response tab
    if (response && active === undefined) setInternalActive('response');
  }, [response, active]);

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
      label: (<><CardIcon className="w-4 h-4 mr-2 inline" />AgentCard</>),
      content: (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => copy('agent', agentCard ? JSON.stringify(agentCard, null, 2) : '')} className="px-2 py-1 rounded-md bg-accent text-white flex items-center gap-2">
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
          {agentCard ? (
            <div className="mb-3">
              {agentCard.name ? <div className="text-lg font-semibold">{agentCard.name}</div> : null}
              {agentCard.description ? <div className="text-sm text-muted mb-2">{agentCard.description}</div> : null}
              {agentCard.skills && Array.isArray(agentCard.skills) ? (
                <div className="mb-2">
                  <div className="font-medium text-sm">Skills</div>
                  <ul className="mt-1 text-sm text-muted list-disc list-inside">
                    {agentCard.skills.map((s: any, i: number) => (
                      <li key={i}><strong>{s.title || s.id}</strong>: {s.description} <span className="text-xs text-muted">({s.price ? `${(s.price.amount / 10 ** s.price.decimals).toFixed(4)} ${s.price.token}` : ''})</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <CodeBlock content={agentCard ? JSON.stringify(agentCard, null, 2) : '(not available)'} />
        </div>
      )
    },

    {
      id: 'payment',
      label: (<><PaymentIcon className="w-4 h-4 mr-2 inline" />X-PAYMENT</>),
      content: (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => copy('payment', payment ? (payment.raw || JSON.stringify(payment, null, 2)) : '')} className="px-2 py-1 rounded-md bg-accent text-white flex items-center gap-2">
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
      label: (<><ResponseIcon className="w-4 h-4 mr-2 inline" />X-PAYMENT-RESPONSE</>),
      content: (
        <div>
          <div className="flex justify-end mb-2">
            <button onClick={() => copy('response', response ? (response.raw || JSON.stringify(response.json || response, null, 2)) : '')} className="px-2 py-1 rounded-md bg-accent text-white flex items-center gap-2">
              <CopyIcon className="w-4 h-4" />
              <span>Copy</span>
            </button>
          </div>
          <CodeBlock content={response ? (response.raw || JSON.stringify(response.json || response, null, 2)) : '(not available)'} />
          {response && response.json && response.json.transaction ? (
            <div className="mt-2 flex items-center gap-2">
              <a href={`${explorerBase}/${response.json.transaction}`} target="_blank" rel="noreferrer" className="text-accent underline flex items-center gap-1">
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
      <Tabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id)} />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
} 