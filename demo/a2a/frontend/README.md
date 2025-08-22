# Frontend — Local quick start

This is the minimal dashboard used to orchestrate and visualize the A2A x402 demo locally.

Quick local start (tested on macOS/Linux):

1. Ensure repository is cloned and you're at the repo root.

2. Create demo env:
   - Copy `demo/.env.local.sample` → `demo/.env.local` and fill required values (RPC, keys, addresses). If you already have `demo/.env.local` in the repo use that.

3. Install dependencies:
   - From the frontend folder:
     ```bash
     cd demo/a2a/frontend
     npm install    # or pnpm install
     ```

4. Start the demo services (one of the following):
   - Option A — single-script (recommended for local testing):
     ```bash
     # run from repo root
     bash demo/scripts/start-all.sh
     ```
   - Option B — start services individually (useful for debugging):
     ```bash
     cd demo/a2a/facilitator-amoy && npm install && npm run dev
     cd demo/a2a/resource-server-express && npm install && npm run dev
     cd demo/a2a/service-agent && npm install && npm run dev
     cd demo/a2a/client-agent && npm install && npm run dev
     ```

5. Start the dashboard UI:
   ```bash
   cd demo/a2a/frontend
   npm run dev
   ```

6. Open the UI in your browser: `http://localhost:3000` and click "Start Demo" (or run the orchestrator script in step 4 and watch the dashboard update).

Troubleshooting
- Logs are written to `/tmp/*.log` (fac.log, service.log, res.log, client_run.log). Tail these for detailed errors.
- If ports conflict, stop existing services or change ports in `demo/.env.local`.
- If `start-all.sh` fails because `demo/.env.local` is missing, copy `demo/.env.local.sample` or create the file with the required values.

That's it — the frontend is intentionally read-only in production; to run orchestration from the UI use the local demo or configure a remote orchestrator and set `ORCHESTRATOR_BASE_URL`.
