# Agents paying other agents with crypto (Polygon Amoy)

This demo shows two independent AI agents collaborating using the A2A (Agent2Agent) protocol while making a small on-chain payment using the x402 HTTP payments standard. The payment settles on the Polygon Amoy testnet.

What you will see:
- An agent (the "Client Agent") requests a premium capability from another agent (the "Service Agent").
- The Service Agent protects its premium capability behind a paywall using x402.
- The Client Agent automatically pays the tiny fee (USDC on Polygon Amoy) via the x402 protocol, then receives the premium result.
- The transaction is submitted to Polygon Amoy and can be viewed in a block explorer.

Why this matters:
- Demonstrates open interoperability: agents from different vendors can communicate via A2A.
- Demonstrates sustainable business models for agents: x402 enables tiny per-request payments with low friction.
- Uses real on-chain settlement (Polygon Amoy testnet) with fast, low-cost transactions.

Roles in the demo:
- Client Agent (A2A client): initiates a task requiring a premium capability.
- Service Agent (A2A server): exposes its capabilities via A2A; one capability is paywalled through x402.
- Facilitator (x402): a payment service that verifies and settles transactions on-chain.
- Resource Server: the HTTP endpoint actually doing the premium work and charging via x402 (often co-located with the Service Agent in this demo).

Outcome:
- A working end-to-end flow where a user runs both agents locally, triggers a premium request, pays a small fee on Polygon Amoy, and sees the paid response plus the on-chain settlement hash. 