# Architecture and Technical Plan

This document defines the end-to-end design for a demo where an A2A Client Agent pays an A2A Service Agent via the x402 protocol, settling on Polygon Amoy (chain ID 80002).

## Objectives
- Demonstrate A2A-compliant agents interoperating using JSON-RPC 2.0 over HTTP.
- Protect a premium HTTP resource with x402 middleware.
- Perform an on-chain payment (USDC-like EIP-3009 token) on Polygon Amoy and return a settlement header.

## Components
1. A2A Client Agent (TypeScript)
   - Role: Issues `message/send` RPC to the Service Agent; if the workflow requires a premium step, it invokes the Service Agent's Resource endpoint protected by x402 and pays automatically using `x402-axios` with a locally held test key.
   - Transport: JSON-RPC over HTTP.
   - Files:
     - `examples/typescript/agent/client/index.ts` (new)
     - Reads `AGENT_CARD_URL` or a local static AgentCard file.
     - Uses Axios client wrapped with `withPaymentInterceptor` from `x402-axios` to pay x402 endpoints.
2. A2A Service Agent (TypeScript)
   - Role: Exposes A2A methods (`message/send`, optionally `message/stream`, `tasks/get`). Implements a “premium skill” that internally calls an x402-protected Resource endpoint.
   - Transport: JSON-RPC over HTTP.
   - Files:
     - `examples/typescript/agent/server/index.ts` (new): minimal JSON-RPC router.
     - `examples/typescript/agent/server/agent-card.json` (new): AgentCard including `preferredTransport`, `additionalInterfaces`, and security schemes.
3. Resource Server (TypeScript)
   - Role: Provides a premium HTTP endpoint (e.g., `/premium/summarize`) protected by `x402-express` middleware; charges small amount in USDC on Polygon Amoy.
   - Files:
     - `examples/typescript/servers/express-amoy/index.ts` (new)
4. x402 Facilitator (TypeScript)
   - Role: Verifies and settles payments on Polygon Amoy using a signer. Local instance for demo.
   - Files:
     - `examples/typescript/facilitator-amoy/index.ts` (new), based on existing facilitator example but configured for Amoy.

## Payment flow
1. Client Agent calls Service Agent via `message/send` with a request that requires the premium endpoint.
2. Service Agent invokes the Resource Server endpoint.
3. Resource Server returns `402` with `accepts: PaymentRequirements[]` including `network: "polygon-amoy"`.
4. Client Agent’s HTTP layer (Axios + `x402-axios`) automatically creates an `X-PAYMENT` header using its local account key and retries.
5. Middleware calls Facilitator `/verify` to validate the payment, continues processing, then calls `/settle` to submit the on-chain transaction.
6. Resource Server adds `X-PAYMENT-RESPONSE` (base64) with `{ success, transaction, network, payer }` and returns results to the Service Agent → Client Agent.

## A2A specifics
- Methods implemented minimally:
  - `message/send`: Accept input message; if premium operation requested, orchestrate the HTTP call to Resource Server.
  - `tasks/get`: Optionally mock or provide simple polling.
- AgentCard:
  - `url`: `http://localhost:5402/a2a` (example)
  - `preferredTransport`: `JSONRPC`
  - `additionalInterfaces`: JSONRPC and option to document REST/gRPC (not implemented in this demo)
  - `capabilities.streaming`: false (simplify)
  - `securitySchemes`: demo-only (Bearer optional)

## Network integration: Polygon Amoy (chainId 80002)
We must add Amoy support to the x402 core for a smooth DX.

Changes required in `packages/x402`:
- `src/types/shared/network.ts`:
  - Add `"polygon-amoy"` to `NetworkSchema` and `SupportedEVMNetworks`.
  - Add mapping to `EvmNetworkToChainId.set("polygon-amoy", 80002)`.
- `src/types/shared/evm/config.ts`:
  - Add chain entry `"80002": { usdcAddress: "<AMOY_TOKEN_ADDRESS>", usdcName: "USDC" }`.
  - Note: pick an EIP-3009-compatible token on Amoy or deploy a minimal test token; update `extra` in `PaymentRequirements` (`{ name: "USDC", version: "2" }`).
- `src/types/shared/evm/wallet.ts`:
  - Add helpers `createClientAmoy()` and `createSignerAmoy(privateKey)` using `viem` chain config for Amoy RPC.

If modification is undesirable, we can override `PaymentRequirements.asset` with the test token address and use generic `SignerWallet` created for Amoy via `viem` without changing the package’s enums, but first-class support improves ergonomics.

## Resource pricing and requirements
- Example `PaymentRequirements` returned on 402:
```json
{
  "scheme": "exact",
  "network": "polygon-amoy",
  "maxAmountRequired": "100000", // 0.1 USDC (6 decimals)
  "resource": "http://localhost:5403/premium/summarize",
  "description": "Premium summarization",
  "mimeType": "application/json",
  "payTo": "0xYourAmoyReceivingAddress",
  "maxTimeoutSeconds": 120,
  "asset": "0xYourAmoyUSDCAddress",
  "extra": { "name": "USDC", "version": "2" },
  "outputSchema": { "input": { "type": "http", "method": "POST" }, "output": {} }
}
```

## Environment variables
- Facilitator:
  - `PRIVATE_KEY` (signer for settling on Amoy)
  - `NETWORK=polygon-amoy` (or explicit chain in code)
- Resource Server:
  - `ADDRESS` (pay-to address)
  - `FACILITATOR_URL` (e.g., http://localhost:5401)
  - `AMOY_USDC_ADDRESS`
- Client Agent:
  - `PRIVATE_KEY` (payer key on Amoy)
  - `RESOURCE_SERVER_URL`
  - `ENDPOINT_PATH=/premium/summarize`
- Service Agent:
  - `AGENT_CARD_PATH` (or URL)

## Directory layout (new files)
- `examples/typescript/agent/client/index.ts`
- `examples/typescript/agent/server/index.ts`
- `examples/typescript/agent/server/agent-card.json`
- `examples/typescript/servers/express-amoy/index.ts`
- `examples/typescript/facilitator-amoy/index.ts`
- `demo/` (this folder with `demo.md`, `research.md`, `architecture.md`)

## Implementation outline
1. Facilitator-Amoy
   - Clone `examples/typescript/facilitator/index.ts` → `facilitator-amoy/index.ts`.
   - Use `createClientAmoy()` and `createSignerAmoy()` (or generic viem with chain ID 80002) to verify/settle.
2. Resource Server (Express)
   - Clone `servers/express/index.ts` → `servers/express-amoy/index.ts`.
   - Set `network: "polygon-amoy"`, `asset: AMOY_USDC_ADDRESS`, `payTo: ADDRESS`.
3. Service Agent (A2A)
   - Minimal JSON-RPC router with `message/send`.
   - When receiving a request `{ skill: "premium.summarize" }`, call the Resource Server endpoint using Axios + `withPaymentInterceptor(account)`.
   - Return the result as the JSON-RPC `result`.
4. Client Agent (A2A)
   - Load `agent-card.json` to get the Service Agent URL.
   - Send `message/send` to request `premium.summarize` with input text; log the result and any `x-payment-response` headers.

## Running the demo
- Terminal 1: Facilitator-Amoy
  - `cd examples/typescript/facilitator-amoy && pnpm start`
- Terminal 2: Resource Server
  - `cd examples/typescript/servers/express-amoy && pnpm start`
- Terminal 3: Service Agent
  - `cd examples/typescript/agent/server && pnpm start`
- Terminal 4: Client Agent
  - `cd examples/typescript/agent/client && pnpm start`

## Validation
- Successful flow prints:
  - 402 challenge payload (first request), retry with `X-PAYMENT` header, final response.
  - Decoded `X-PAYMENT-RESPONSE` with `transaction` and `network: "polygon-amoy"`.
- Verify the transaction hash on `https://amoy.polygonscan.com/`.

## Risks and mitigations
- EIP-3009 token availability: if no official USDC test token on Amoy supports `transferWithAuthorization`, deploy a minimal EIP-3009-compatible token for demo.
- Chain RPC reliability: provide multiple RPC endpoints or run a local node provider.
- Timeouts: increase `maxTimeoutSeconds` and client retry limits for testnet variability.

## Future enhancements
- Add streaming (`message/stream`) and push notifications for long-running tasks.
- Support multiple price tiers and dynamic pricing per request.
- Add agent authentication (Bearer/jwt) aligning with `AgentCard.securitySchemes`. 