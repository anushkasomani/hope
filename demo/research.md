# Research checklist

This document captures what we must understand/decide before and during implementation.

## Protocols and standards
- A2A
  - JSON-RPC 2.0 method mapping: `message/send`, `message/stream`, `tasks/get`, `tasks/cancel`, push notification APIs, `agent/getAuthenticatedExtendedCard`.
  - Data model: `Task`, `TaskStatus`, `Message`, `Part` (Text/Data/File), `Artifact`, `AgentCard` (discovery, capabilities, security schemes, transports).
  - Transport: HTTP(S) JSON-RPC; SSE for streaming; webhook push notifications.
  - Auth: HTTP-layer (Bearer/API key/etc.) declared in `AgentCard.securitySchemes`.
- x402
  - Flow: 402 challenge → client creates `X-PAYMENT` (base64 PaymentPayload) → server verifies (facilitator) → serves → settles → adds `X-PAYMENT-RESPONSE`.
  - Scheme: `exact` (EIP-3009 `transferWithAuthorization`), payload signature recovery and checks.
  - Facilitator endpoints: `POST /verify`, `POST /settle`, `GET /supported`.
  - Middleware packages: `x402-express`, `x402-hono`, `x402-next`; client wrappers: `x402-fetch`, `x402-axios`.

## Polygon Amoy specifics
- Chain ID: 80002 (Polygon PoS Amoy testnet).
- RPC providers and chain config for `viem`.
- USDC(-like) token with EIP-3009 `transferWithAuthorization` on Amoy:
  - Identify token address supporting EIP-3009 (or deploy a minimal EIP-3009 test token if no official USDC-equivalent is available on Amoy).
  - Get domain name/version for EIP-712 (e.g., `USDC`, version `2`) to populate `PaymentRequirements.extra`.
- Faucet and funding strategy for the client account.

## x402 library adaptation
- Add Amoy network mapping:
  - Add `"polygon-amoy"` to `NetworkSchema` and to `EvmNetworkToChainId` → `80002`.
  - Add USDC test token address and name to `types/shared/evm/config.ts` for chain `80002`.
- Add helper creators in `types/shared/evm/wallet` (e.g., `createClientAmoy`, `createSignerAmoy`).
- Verify paywall build includes Polygon Amoy (optional).

## Agent and resource design
- Service Agent (A2A server):
  - Exposes `message/send` for a "premium skill" (e.g., summarization with extra context, or calling an external API).
  - Internally calls its Resource Server over HTTP; the resource is x402-protected.
  - Publishes an `AgentCard` with transports and security schemes.
- Client Agent (A2A client):
  - Reads the `AgentCard` (static file for demo) and calls `message/send`.
  - Handles 402 responses from Resource Server using `x402-axios` with a local account wallet.

## Security and ops
- Local-only demo uses `.env` with dev keys; never use real funds.
- CORS settings for client → resource; ensure `Access-Control-Expose-Headers: X-PAYMENT-RESPONSE` on retries.
- Observability: log tx hashes and verification errors.

## UX and verification
- Print `X-PAYMENT-RESPONSE` decoded payload (tx hash, network, payer).
- Link to Polygon Amoy explorer for the transaction.
- Provide scripts for: start facilitator, start resource, start service agent, run client agent. 