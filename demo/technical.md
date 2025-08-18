# Technical details — A2A x402 Polygon Amoy Demo

This document records the precise technical changes, file responsibilities, protocol mappings (A2A, x402), EIP-712 typed-data specifics, and design rationale for the demo implemented under `demo/a2a/`.

1) High-level architecture

- Client Agent (A2A client)
  - Sends JSON-RPC `message/send` to Service Agent's JSON-RPC endpoint.
  - When a premium skill is requested and the Resource Server returns 402 with `accepts`, the client constructs an EIP-712 `PaymentPayload` for the `exact` (EIP-3009) scheme and encodes it as base64 in the `X-PAYMENT` header.
  - The client retries the `message/send` call with `X-PAYMENT`; Service Agent forwards the header to Resource Server.

- Service Agent (A2A server)
  - Minimal JSON-RPC handler at `/a2a` supporting `message/send`.
  - For `skill === "premium.summarize"` it calls Resource Server `/premium/summarize` and returns upstream `result` or `error` (propagates 402 `accepts` payload to A2A caller).

- Resource Server (Express)
  - Exposes `POST /premium/summarize`.
  - If no `X-PAYMENT` header, returns HTTP 402 with a body: `{ accepts: [ PaymentRequirements ] }` where each PaymentRequirements contains `scheme: 'exact'`, `network: 'polygon-amoy'`, `asset`, `payTo`, `maxAmountRequired`, `maxTimeoutSeconds`, `extra` (e.g., token name/version), and `outputSchema`.
  - If `X-PAYMENT` header present, calls Facilitator `/verify`.
  - On successful verify, processes the premium request and then calls Facilitator `/settle` to broadcast the EIP-3009 transaction (if configured to settle).
  - Adds `X-PAYMENT-RESPONSE` header (base64 JSON) with `{ success, transaction, network, payer }`.

- Facilitator (Amoy)
  - `/supported` returns supported `network: polygon-amoy` and `scheme: exact`.
  - `/verify` accepts base64 PaymentPayload (or `X-PAYMENT` header) and validates:
    - `chainId` equals 80002
    - time window (`validAfter`, `validBefore`)
    - nonce replay protection
    - EIP-712 typed-data signature verification: `ethers.verifyTypedData(domain, types, message, signature)`
    - Fallback to older raw `keccak256(JSON)` recovery if typed-data verification fails (for demo compatibility).
  - `/settle` calls `transferWithAuthorization` on the token contract using the facilitator signer if `REAL_SETTLE=true`. Waits for confirmation and returns tx hash.

2) Files added/modified (exact paths)

- `demo/a2a/` (main demo folder)

- Facilitator
  - `demo/a2a/facilitator-amoy/src/index.ts` — Express app implementing `/supported`, `/verify`, `/settle`, healthz, in-memory nonce store, EIP-712 verification and settlement logic.
  - `demo/a2a/facilitator-amoy/src/types.ts` — TypeScript DTOs for PaymentPayload and related interfaces.
  - `demo/a2a/facilitator-amoy/package.json`, `tsconfig.json` — package configuration and compilation target.

- Resource Server
  - `demo/a2a/resource-server-express/src/index.ts` — Express server route `/premium/summarize`, uses `x402` helper functions to build `PaymentRequirements` and call facilitator endpoints.
  - `demo/a2a/resource-server-express/src/x402.ts` — helper: `buildPaymentRequirements(resourceUrl, payTo, asset)`, `verifyPayment(paymentPayloadBase64)`, `settlePayment(paymentPayloadBase64)` (calls facilitator HTTP endpoints).
  - `demo/a2a/resource-server-express/src/premium/summarize.ts` — simple summarization handler.

- Service Agent (A2A server)
  - `demo/a2a/service-agent/src/index.ts` — minimal JSON-RPC router at `/a2a` implementing `message/send` and forwarding to Resource Server. Uses `client/http.ts` for Axios client.
  - `demo/a2a/service-agent/src/client/http.ts` — Axios client wrapper for calling resource server and forwarding `X-PAYMENT`.
  - `demo/a2a/service-agent/agent-card.json` — AgentCard (example) advertising `preferredTransport: JSONRPC` and `capabilities.streaming: false`.

- Client Agent (A2A client)
  - `demo/a2a/client-agent/src/index.ts` — CLI entry that calls `sendMessage()` for `premium.summarize`.
  - `demo/a2a/client-agent/src/a2a.ts` — JSON-RPC client that performs `message/send`, processes 402 responses, picks first `accepts`, constructs payment payload, retries with `X-PAYMENT` header.
  - `demo/a2a/client-agent/src/payment.ts` — EIP‑712 typed-data `TransferWithAuthorization` payload creation and `signTypedData` call. Encodes payload as base64 for `X-PAYMENT` header.

- Demo-level config
  - `demo/.env.local` — demo environment variables (RPC, keys, addresses, AMOY_USDC_ADDRESS, REAL_SETTLE flag, PAYMENT_AMOUNT, etc.)

3) Protocol specifics and exact EIP-712 types

- A2A (used parts):
  - Transport: JSON-RPC 2.0 over HTTP. Minimal method: `message/send`.
  - AgentCard: `url`, `preferredTransport: "JSONRPC"`, `capabilities.streaming: false`, `securitySchemes` demo-only (optional).
  - Data model: minimal `Message` and `Task` shapes sufficient for the demo.

- x402 (used parts):
  - Flow: 402 challenge → client constructs `X-PAYMENT` (base64 PaymentPayload) → server calls Facilitator `/verify` → server serves and calls Facilitator `/settle` → server returns `X-PAYMENT-RESPONSE` header.
  - PaymentRequirements (402 body):
    - `scheme: "exact"` (EIP-3009 `transferWithAuthorization`)
    - `network: "polygon-amoy"` (chainId 80002)
    - `resource`, `payTo`, `asset`, `maxAmountRequired`, `maxTimeoutSeconds`, `extra` with `{ name, version }`
  - PaymentPayload (client `X-PAYMENT`): includes the EIP‑712 typed-data fields and the signature. For demo we encode the entire payload JSON as base64.

- EIP-712 typed-data (TransferWithAuthorization shape used):
  - Domain: { name: <token_name>, version: <token_version>, chainId: 80002, verifyingContract: <token_address> }
  - Types:
    TransferWithAuthorization(
      address from,
      address to,
      uint256 value,
      uint256 validAfter,
      uint256 validBefore,
      bytes32 nonce
    )

- Facilitator verification steps (exact):
  - decode `X-PAYMENT` base64 to JSON payload
  - assert `payload.chainId === 80002`
  - ensure `validAfter <= now <= validBefore`
  - ensure `nonce` not used (in-memory demo set)
  - call `ethers.verifyTypedData(domain, types, message, signature)` to recover signer
  - compare recovered signer to `payload.from`
  - fallback: compute `hash = keccak256(toUtf8Bytes(JSON.stringify(message)))` and `ethers.recoverAddress(hash, signature)` (demo compatibility)

- Facilitator settlement (exact):
  - If `REAL_SETTLE=true`, use facilitator signer to call `token.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, signature)` using token ABI.
  - Wait for confirmation (1 confirmation) and return tx hash.

4) How this maps to the upstream repos

- A2A repo (https://github.com/a2aproject/A2A)
  - We implement a minimal JSON-RPC transport and `AgentCard` for discovery. We followed the A2A spec for method naming (`message/send`) and AgentCard fields.
  - We do not implement streaming (`message/stream`) or push notifications in this demo.

- x402 family (implemented in this repo's packages like `x402-express`, `x402-axios`)
  - The demo uses the x402 flow: 402 challenge, `X-PAYMENT` header, Facilitator `/verify` and `/settle` endpoints, and `X-PAYMENT-RESPONSE` header.
  - We used `exact` scheme (EIP-3009) semantics for the PaymentRequirements and PaymentPayload shape.

5) Security, limitations, and caveats

- Nonce storage is in-memory for demo only — not safe in production. Use durable stores to prevent replays across processes.
- Domain fields must match token's EIP-712 domain exactly. I normalized `verifyingContract` based on `AMOY_USDC_ADDRESS` from env.
- The demo logs typed-data to the console for debugging — remove sensitive logs for production.
- The facilitator uses the provided `FACILITATOR_PRIVATE_KEY` to broadcast real settlement txs if `REAL_SETTLE=true`.

6) How to reproduce the end-to-end real transaction

1. Fund facilitator with POL for gas and ensure `FACILITATOR_PRIVATE_KEY`/`FACILITATOR_ADDRESS` are set in `demo/.env.local`.
2. Ensure the token at `AMOY_USDC_ADDRESS` supports EIP-3009 `transferWithAuthorization` and has domain `{ name, version }` matching what is set in the demo (default `USDC`/`2`).
3. Start services and run the client:
   - `node demo/a2a/facilitator-amoy/dist/index.js &`
   - `node demo/a2a/resource-server-express/dist/index.js &`
   - `node demo/a2a/service-agent/dist/index.js &`
   - `node demo/a2a/client-agent/dist/index.js`
4. Check facilitator logs for `settlement tx submitted <txHash>` and verify on Amoy explorer.

7) Notes for cleanup & next work

- Add durable nonce store (Redis or DB) and idempotency for `/settle`.
- Harden facilitator: better error handling, retries, and observability.
- Add support for `message/stream` (SSE) and push notifications in a future iteration.

---

If you want, I can now:
- Push the README and technical.md into the repo (I already created them locally), or
- Add persistent nonce storage and re-run tests, or
- Create a short script to start all services and run the client end-to-end automatically. 