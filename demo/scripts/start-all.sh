#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load env
if [ -f "$ROOT_DIR/.env.local" ]; then
  # shellcheck disable=SC1091
  set -a
  . "$ROOT_DIR/.env.local"
  set +a
else
  echo "ERROR: demo/.env.local not found. Copy demo/.env.local.sample and set values." >&2
  exit 1
fi

echo "Compiling demo packages..."
npx -y tsc -p demo/a2a/facilitator-amoy/tsconfig.json
npx -y tsc -p demo/a2a/resource-server-express/tsconfig.json
npx -y tsc -p demo/a2a/service-agent/tsconfig.json
npx -y tsc -p demo/a2a/client-agent/tsconfig.json

# Kill anything on the demo ports
for port in "${FACILITATOR_PORT:-5401}" "${SERVICE_AGENT_PORT:-5402}" "${RESOURCE_SERVER_PORT:-5403}"; do
  pids=$(lsof -n -iTCP:"$port" -sTCP:LISTEN -t || true)
  if [ -n "$pids" ]; then
    echo "Killing processes on port $port: $pids"
    kill -9 $pids || true
  fi
done

# Start services
echo "Starting Facilitator..."
nohup env FACILITATOR_PRIVATE_KEY="$FACILITATOR_PRIVATE_KEY" AMOY_RPC_URL="$AMOY_RPC_URL" AMOY_USDC_ADDRESS="$AMOY_USDC_ADDRESS" REAL_SETTLE="$REAL_SETTLE" node demo/a2a/facilitator-amoy/dist/index.js > /tmp/fac.log 2>&1 &
echo $! > /tmp/fac.pid
sleep 0.6

echo "Starting Resource Server..."
nohup env FACILITATOR_URL="$FACILITATOR_URL" node demo/a2a/resource-server-express/dist/index.js > /tmp/res.log 2>&1 &
echo $! > /tmp/res.pid
sleep 0.6

echo "Starting Service Agent..."
nohup env RESOURCE_SERVER_URL="$RESOURCE_SERVER_URL" node demo/a2a/service-agent/dist/index.js > /tmp/service.log 2>&1 &
echo $! > /tmp/service.pid
sleep 1

# Wait for health endpoints
echo "Waiting for services to become healthy..."
npx wait-on "http://localhost:${FACILITATOR_PORT:-5401}/healthz" "http://localhost:${RESOURCE_SERVER_PORT:-5403}/healthz" "http://localhost:${SERVICE_AGENT_PORT:-5402}/healthz" --timeout 20000 || { echo "Services failed to start in time" >&2; exit 1; }

echo "Running Client Agent to exercise demo..."
nohup env PRIVATE_KEY="$PRIVATE_KEY" PRIVATE_KEY_ADDRESS="$PRIVATE_KEY_ADDRESS" SERVICE_AGENT_URL="$SERVICE_AGENT_URL" PAYMENT_AMOUNT="$PAYMENT_AMOUNT" node demo/a2a/client-agent/dist/index.js > /tmp/client_run.log 2>&1 || true

echo "Client run finished — printing logs (tail)"

printf "\n--- CLIENT LOG (last 200 lines) ---\n"
tail -n 200 /tmp/client_run.log || true
printf "\n--- FACILITATOR LOG (last 200 lines) ---\n"
tail -n 200 /tmp/fac.log || true
printf "\n--- RESOURCE LOG (last 200 lines) ---\n"
tail -n 200 /tmp/res.log || true
printf "\n--- SERVICE LOG (last 200 lines) ---\n"
tail -n 200 /tmp/service.log || true

echo "Demo run complete. If REAL_SETTLE=true, check the tx hash in facilitator logs and verify on Amoy explorer." 