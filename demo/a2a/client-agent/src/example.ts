import { payAndCall, type PayAndCallOptions } from './sdk.js';

async function main() {
  const serviceUrl = process.env.RESOURCE_SERVER_URL || 'http://localhost:5403';
  const tokenContract = process.env.AMOY_USDC_ADDRESS || '';
  const payFrom = process.env.PRIVATE_KEY_ADDRESS || '';
  const payTo = process.env.ADDRESS || '';
  const amount = process.env.PAYMENT_AMOUNT || '1000';

  if (!tokenContract || !payFrom || !payTo) {
    throw new Error('Missing env: AMOY_USDC_ADDRESS, PRIVATE_KEY_ADDRESS, ADDRESS');
  }

  const opts: PayAndCallOptions = {
    serviceUrl,
    endpoint: '/premium/summarize',
    method: 'POST',
    body: { text: 'hello x402 from SDK example' },
    tokenContract,
    payFrom,
    payTo,
    amount
  };

  console.log('Calling payAndCall...', { serviceUrl, payTo, amount });
  const res = await payAndCall(opts);
  const text = await res.text();
  console.log('Response status:', res.status);
  console.log('Response body:', text);
}

main().catch((err) => {
  console.error('Example failed:', err);
  process.exit(1);
});


