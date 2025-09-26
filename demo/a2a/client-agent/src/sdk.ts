import { createDemoPaymentPayload, encodePaymentPayload } from './payment.js';

export type PayAndCallOptions = {
  serviceUrl: string;
  endpoint: string; // e.g. /premium/summarize
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  tokenContract: string; // verifyingContract (e.g., Amoy USDC)
  payFrom: string; // user address
  payTo: string; // service payTo address
  amount: string; // wei-like string (e.g., USDC 6 decimals -> parse off-chain)
  headers?: Record<string, string>;
};

export async function payAndCall(opts: PayAndCallOptions): Promise<Response> {
  const {
    serviceUrl,
    endpoint,
    method = 'POST',
    body,
    tokenContract,
    payFrom,
    payTo,
    amount,
    headers = {}
  } = opts;

  const paymentPayload = await createDemoPaymentPayload(payFrom, payTo, amount, tokenContract);
  const xPayment = encodePaymentPayload(paymentPayload);

  const url = serviceUrl.replace(/\/$/, '') + endpoint;
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': xPayment,
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  } as any;

  // First attempt with X-PAYMENT header; if server expects a 402-first dance, it should still accept with header present.
  const res = await fetch(url, init as any);
  return res;
}


