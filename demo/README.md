# A2A x402 Polygon Amoy Demo (brief)

This demo shows two independent agents (A2A) cooperating to request and pay for a premium HTTP resource using the x402 payment flow. Payments are settled on Polygon Amoy (chainId 80002) using an EIP-3009 style `transferWithAuthorization` flow via a local Facilitator.

High-level components

- Facilitator (demo): `/demo/a2a/facilitator-amoy` — verifies payment payloads and (optionally) broadcasts settlement transactions on Amoy.
- Resource Server: `/demo/a2a/resource-server-express` — exposes the premium endpoint (`/premium/summarize`) and returns 402 challenge + PaymentRequirements when unpaid.
- Service Agent (A2A server): `/demo/a2a/service-agent` — implements minimal A2A `message/send` JSON-RPC and proxies premium requests to the Resource Server.
- Client Agent (A2A client): `/demo/a2a/client-agent` — issues `message/send`, handles 402, constructs an EIP-712 `X-PAYMENT` payload, and retries.

Quick run (local)

1. Configure `demo/.env.local` with keys, Amoy RPC, and token address (do NOT commit real keys).
2. From repo root: compile packages or use the helper script below.
3. Start services and run the client end-to-end with the helper script:
   - `bash demo/scripts/start-all.sh`

(Alternatively, run manual steps per component as needed.)

Where to look for details

- For full technical details and design decisions, see `demo/technical.md`.
- Runtime logs are produced in `/tmp/*.log` during local runs (client, facilitator, resource, service).

Security & notes

- This demo uses real testnet keys and an Amoy RPC when `REAL_SETTLE=true`. Only use funded test accounts and testnets. Do not use mainnet keys.
- The demo includes simplified logic and in-memory nonce handling — do not use as-is in production. 